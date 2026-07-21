import { TASK_STATUSES, type TaskStatus } from '#enums/task_status'
import { TASK_PRIORITIES, type TaskPriority } from '#enums/task_priority'

export type TaskCommandAction = 'create_task' | 'update_task' | 'delete_task'

interface CreateTaskCommand {
  action: 'create_task'
  projectId: number
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: number
}

interface UpdateTaskCommand {
  action: 'update_task'
  taskId: number
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: number
}

interface DeleteTaskCommand {
  action: 'delete_task'
  taskId: number
}

export type TaskCommand = CreateTaskCommand | UpdateTaskCommand | DeleteTaskCommand

export type TaskCommandValidationResult =
  { success: true; data: TaskCommand[] } | { success: false; reason: string }

/**
 * Raw shape of a single command as Gemini returns it, per the
 * Commit 19 schema - snake_case keys, every field except `action`
 * nullable.
 */
interface RawTaskCommand {
  action: unknown
  project_id: number | null
  task_id: number | null
  title: string | null
  description: string | null
  status: string | null
  priority: string | null
  assignee_id: number | null
}

/**
 * Removes every null-valued key from a raw command. A null here
 * means "the instruction didn't mention this field" (a necessary
 * consequence of Commit 19's schema having no per-action required-
 * field support), never "set this column to null" - callers past
 * this point must never see a field they'd need to null out.
 */
function stripNulls(raw: RawTaskCommand): Partial<RawTaskCommand> {
  const stripped: Partial<RawTaskCommand> = {}

  for (const [key, value] of Object.entries(raw)) {
    if (value !== null) {
      ;(stripped as Record<string, unknown>)[key] = value
    }
  }

  return stripped
}

function isValidStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value)
}

function isValidPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && (TASK_PRIORITIES as readonly string[]).includes(value)
}

/**
 * Validates and normalizes a single stripped command for its
 * stated action. Returns a typed, camelCase TaskCommand on success,
 * or a specific human-readable reason on failure - the reason is
 * surfaced directly in the endpoint's 400 response, so it must be
 * meaningful to the caller, not a generic "invalid command".
 */
function validateSingleCommand(
  raw: RawTaskCommand,
  index: number
): { success: true; data: TaskCommand } | { success: false; reason: string } {
  const stripped = stripNulls(raw)
  const label = `command #${index + 1} (${String(raw.action)})`

  if (stripped.status !== undefined && !isValidStatus(stripped.status)) {
    return { success: false, reason: `${label}: invalid status "${stripped.status}"` }
  }

  if (stripped.priority !== undefined && !isValidPriority(stripped.priority)) {
    return { success: false, reason: `${label}: invalid priority "${stripped.priority}"` }
  }

  switch (raw.action) {
    case 'create_task': {
      if (typeof stripped.project_id !== 'number') {
        return { success: false, reason: `${label}: missing required field "project_id"` }
      }
      if (typeof stripped.title !== 'string' || stripped.title.trim().length === 0) {
        return { success: false, reason: `${label}: missing required field "title"` }
      }

      return {
        success: true,
        data: {
          action: 'create_task',
          projectId: stripped.project_id,
          title: stripped.title,
          description: stripped.description ?? undefined,
          status: stripped.status as TaskStatus | undefined,
          priority: stripped.priority as TaskPriority | undefined,
          assigneeId: stripped.assignee_id ?? undefined,
        },
      }
    }

    case 'update_task': {
      if (typeof stripped.task_id !== 'number') {
        return { success: false, reason: `${label}: missing required field "task_id"` }
      }

      const hasAnyUpdateField =
        stripped.title !== undefined ||
        stripped.description !== undefined ||
        stripped.status !== undefined ||
        stripped.priority !== undefined ||
        stripped.assignee_id !== undefined

      if (!hasAnyUpdateField) {
        return {
          success: false,
          reason: `${label}: no fields to update after removing unspecified fields`,
        }
      }

      return {
        success: true,
        data: {
          action: 'update_task',
          taskId: stripped.task_id,
          title: stripped.title ?? undefined,
          description: stripped.description ?? undefined,
          status: stripped.status as TaskStatus | undefined,
          priority: stripped.priority as TaskPriority | undefined,
          assigneeId: stripped.assignee_id ?? undefined,
        },
      }
    }

    case 'delete_task': {
      if (typeof stripped.task_id !== 'number') {
        return { success: false, reason: `${label}: missing required field "task_id"` }
      }

      return { success: true, data: { action: 'delete_task', taskId: stripped.task_id } }
    }

    default:
      return { success: false, reason: `${label}: unrecognized action "${String(raw.action)}"` }
  }
}

/**
 * Validates Gemini's full raw structured-output array. The entire
 * batch fails on the first invalid command, rather than silently
 * dropping it and executing the rest - critical for multi-
 * instruction prompts, where silently dropping a garbled second
 * instruction would leave the caller believing both actions
 * succeeded when only one did.
 */
export function validateTaskCommands(rawCommands: unknown): TaskCommandValidationResult {
  if (!Array.isArray(rawCommands)) {
    return { success: false, reason: 'AI response was not an array of commands' }
  }

  const validated: TaskCommand[] = []

  for (const [i, rawCommand] of rawCommands.entries()) {
    const result = validateSingleCommand(rawCommand as RawTaskCommand, i)

    if (!result.success) {
      return result
    }

    validated.push(result.data)
  }

  return { success: true, data: validated }
}
