/**
 * Canonical list of task priorities. See task_status.ts for why
 * this lives as a shared enum rather than inline string literals.
 */
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const

export type TaskPriority = (typeof TASK_PRIORITIES)[number]
