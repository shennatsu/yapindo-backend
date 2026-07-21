import vine from '@vinejs/vine'

/**
 * Validates POST /login payloads. Deliberately loose on `password`
 * (no minLength check here) - credential correctness is checked
 * against the hash via User.verifyCredentials(), not by the
 * validator; a strict format check here would only leak information
 * about why a login attempt failed.
 */
export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email(),
    password: vine.string(),
  })
)
