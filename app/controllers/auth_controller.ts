import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { registerValidator } from '#validators/register_validator'

export default class AuthController {
  /**
   * POST /register
   *
   * Creates a new account as either role. Deliberately does not issue
   * a token - see Commit 7 (login) for session/token creation.
   */
  async register({ request, response }: HttpContext) {
    const payload = await request.validateUsing(registerValidator)
    const user = await User.create(payload)

    return response.created({ data: user })
  }
}
