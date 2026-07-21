/**
 * Canonical list of user roles.
 *
 * Shared between the `users` table migration (DB-level check constraint)
 * and application code — the `User` model, request validators, and the
 * role-based authorization middleware introduced in later commits — so
 * the database schema and the application's type system can never drift
 * out of sync with each other.
 */
export const USER_ROLES = ['admin', 'user'] as const

export type UserRole = (typeof USER_ROLES)[number]
