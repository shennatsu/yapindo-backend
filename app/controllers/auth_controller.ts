import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import jwtService from '#services/jwt_service'
import { registerValidator } from '#validators/register_validator'
import { loginValidator } from '#validators/login_validator'
import jwtConfig from '#config/jwt'

export default class AuthController {
  /**
   * POST /register
   *
   * Creates a new account as either role. Does not issue a token -
   * register and login are kept as separate concerns.
   */
  async register({ request, response }: HttpContext) {
    const payload = await request.validateUsing(registerValidator)
    const user = await User.create(payload)

    return response.created({ data: user })
  }

  /**
   * POST /login
   *
   * Verifies credentials via the User model's withAuthFinder mixin
   * and, on success, issues a JWT carrying { userId, role }. Any
   * verification failure (unknown email or wrong password) returns
   * the same generic 401 to avoid leaking which case occurred.
   */
  async login({ request, response }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    let user: User
    try {
      user = await User.verifyCredentials(email, password)
    } catch {
      return response.unauthorized({ message: 'Invalid email or password' })
    }

    const token = jwtService.sign({ userId: user.id, role: user.role })

    return response.ok({
      data: user,
      token: {
        type: 'bearer',
        value: token,
        expiresIn: jwtConfig.expiresIn,
      },
    })
  }
}
