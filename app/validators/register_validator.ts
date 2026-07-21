import vine from '@vinejs/vine'
import { USER_ROLES } from '#enums/user_role'

/**
 * Validates POST /register payloads.
 *
 * `role` is optional and restricted to the shared UserRole enum
 * (see app/enums/user_role.ts) so this validator, the users table
 * check constraint, and the User model's type can never drift apart.
 * When omitted, the `users.role` column default ('user') applies.
 */
export const registerValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(255),
    email: vine
      .string()
      .trim()
      .email()
      .unique(async (db, value) => {
        const existing = await db.from('users').where('email', value).first()
        return !existing
      }),
    password: vine.string().minLength(8).maxLength(180),
    role: vine.enum(USER_ROLES).optional(),
  })
)
