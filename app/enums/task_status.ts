/**
 * Canonical list of task statuses.
 *
 * Shared between the `tasks` table migration (DB-level check
 * constraint), the Task model, and the AI Command feature's response
 * validator (later commit) - a drifted list there could cause a
 * valid AI-generated status to be wrongly rejected, or an invalid
 * one wrongly accepted and inserted.
 */
export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]
