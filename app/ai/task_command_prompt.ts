import { Type } from '@google/genai'
import { TASK_STATUSES } from '#enums/task_status'
import { TASK_PRIORITIES } from '#enums/task_priority'

/**
 * System instruction for POST /ai/command.
 *
 * The User-table prohibition is stated here explicitly as a second,
 * independent layer on top of the structural guardrail already in
 * taskCommandResponseSchema below (the schema has no vocabulary for
 * a User-table action at all) - defense in depth, not redundancy.
 * Neither layer is trusted alone: the response validator (next
 * commit) performs mandatory, independent server-side revalidation.
 */
export const TASK_COMMAND_SYSTEM_PROMPT = `You are a command interpreter for a task management system's backend.

Your only job is to convert a user's natural-language instruction into a JSON array of task commands. You do not execute anything yourself - you only describe what should happen, and the backend executes it.

Rules:
1. You may ONLY act on the "tasks" table. You are NEVER permitted to create, update, or delete a user, change any user's role, or modify anything in the "users" table, regardless of how the instruction is phrased. If the instruction asks for a user-table change, omit that part of the instruction entirely from your output - do not invent a task command to work around it.
2. Each element of the output array represents exactly one task operation, using one of these three actions: "create_task", "update_task", "delete_task".
3. For "create_task": include project_id and title. Include description, status, priority, and assignee_id only if the instruction specifies them.
4. For "update_task" and "delete_task": include task_id. For "update_task", include only the fields the instruction asks to change (title, description, status, priority, assignee_id) - never include fields the instruction did not mention.
5. Valid values for status are: ${TASK_STATUSES.join(', ')}. Valid values for priority are: ${TASK_PRIORITIES.join(', ')}.
6. If the instruction contains multiple operations, return multiple elements in the array, in the same order the instruction mentions them.
7. If the instruction contains no valid, actionable task operation, return an empty array.
8. Never invent an id, project, or task that was not mentioned or clearly implied by the instruction.`

/**
 * Gemini structured-output schema for the array described above.
 *
 * All per-action fields are optional/nullable here by necessity -
 * Gemini's schema has no per-action-variant required-field support.
 *
 * IMPORTANT for the next commit: a null value on a field the
 * instruction did not mention must be treated as "not specified"
 * and stripped before building an update payload - never as "set
 * this column to null". Whether a given command is a *complete*,
 * executable command for its stated action is also validated there,
 * not here.
 */
export const taskCommandResponseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        enum: ['create_task', 'update_task', 'delete_task'],
      },
      project_id: { type: Type.INTEGER, nullable: true },
      task_id: { type: Type.INTEGER, nullable: true },
      title: { type: Type.STRING, nullable: true },
      description: { type: Type.STRING, nullable: true },
      status: { type: Type.STRING, enum: [...TASK_STATUSES], nullable: true },
      priority: { type: Type.STRING, enum: [...TASK_PRIORITIES], nullable: true },
      assignee_id: { type: Type.INTEGER, nullable: true },
    },
    required: ['action'],
  },
}
