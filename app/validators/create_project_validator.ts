import vine from '@vinejs/vine'

/**
 * Validates POST /projects payloads.
 *
 * `created_by` is intentionally not part of this schema - it is
 * always derived from the authenticated admin (ctx.auth.user.id) in
 * the controller, never accepted from the request body, to prevent
 * an admin from attributing a project to a different user.
 */
export const createProjectValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(255),
    description: vine.string().trim().minLength(1),
  })
)
