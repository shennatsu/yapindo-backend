import vine from '@vinejs/vine'

/**
 * Validates PUT /projects/:id payloads.
 *
 * Full-replace semantics (both fields required), matching PUT rather
 * than PATCH. Same as create, `created_by` is not accepted here -
 * project ownership is immutable via the API.
 */
export const updateProjectValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(255),
    description: vine.string().trim().minLength(1),
  })
)
