import type { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'
import { aiCommandValidator } from '#validators/ai_command_validator'
import { validateTaskCommands } from '#ai/task_command_validator'
import { TASK_COMMAND_SYSTEM_PROMPT, taskCommandResponseSchema } from '#ai/task_command_prompt'
import geminiService from '#services/gemini_service'
import taskCommandExecutor from '#services/task_command_executor'
import TaskCommandExecutionException from '#exceptions/task_command_execution_exception'

const AI_COMMAND_ACTION = 'AI_COMMAND'

export default class AiCommandsController {
  /**
   * POST /ai/command
   *
   * Available to any authenticated role (Bagian 3). Every call writes
   * exactly one audit_logs row, whether it succeeds or fails - the
   * write happens outside the task-mutation transaction so a rolled-
   * back batch's own failure record survives.
   */
  async store({ request, response, auth }: HttpContext) {
    const { prompt } = await request.validateUsing(aiCommandValidator)

    let rawResponse: unknown
    try {
      rawResponse = await geminiService.generateStructuredJson(
        prompt,
        TASK_COMMAND_SYSTEM_PROMPT,
        taskCommandResponseSchema
      )
    } catch (error: any) {
      await this.#audit(
        auth.user!.id,
        prompt,
        null,
        'failed',
        `Gemini API call failed: ${error.message}`
      )
      return response.badRequest({
        message: 'Failed to process the instruction. Please try again.',
      })
    }

    const validation = validateTaskCommands(rawResponse)
    if (!validation.success) {
      await this.#audit(auth.user!.id, prompt, rawResponse, 'failed', validation.reason)
      return response.badRequest({ message: validation.reason })
    }

    try {
      const results = await taskCommandExecutor.execute(validation.data)
      await this.#audit(auth.user!.id, prompt, rawResponse, 'success')

      return response.ok({ data: results })
    } catch (error) {
      if (error instanceof TaskCommandExecutionException) {
        await this.#audit(auth.user!.id, prompt, rawResponse, 'failed', error.message)
        return response.badRequest({ message: error.message })
      }

      await this.#audit(
        auth.user!.id,
        prompt,
        rawResponse,
        'failed',
        'Unexpected error while executing commands'
      )
      throw error
    }
  }

  async #audit(
    userId: number,
    prompt: string,
    responsePayload: unknown,
    status: 'success' | 'failed',
    failedReason?: string
  ) {
    await AuditLog.create({
      userId,
      action: AI_COMMAND_ACTION,
      requestPayload: { prompt },
      responsePayload:
        responsePayload === null ? null : (responsePayload as Record<string, unknown>),
      status,
      failedReason: failedReason ?? null,
    })
  }
}
