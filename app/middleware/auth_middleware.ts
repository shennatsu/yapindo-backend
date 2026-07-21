import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import jwtService from '#services/jwt_service'
import User from '#models/user'

/**
 * Verifies the Bearer token on the Authorization header and attaches
 * the corresponding User as ctx.auth.user for downstream handlers.
 *
 * The user is re-fetched from the DB on every request (rather than
 * trusting the token's embedded role) so a role change takes effect
 * immediately, instead of only once the token expires.
 *
 * Every failure mode collapses to the same generic 401 - missing
 * header, malformed/expired token, and a token for a deleted user
 * are all indistinguishable to the caller.
 */
export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { request, response } = ctx
    const header = request.header('Authorization')

    if (!header || !header.startsWith('Bearer ')) {
      return response.unauthorized({ message: 'Unauthorized' })
    }

    const token = header.slice('Bearer '.length).trim()

    try {
      const payload = jwtService.verify(token)
      const user = await User.find(payload.userId)

      if (!user) {
        return response.unauthorized({ message: 'Unauthorized' })
      }

      ctx.auth = { user }
    } catch {
      return response.unauthorized({ message: 'Unauthorized' })
    }

    return next()
  }
}

/**
 * Augments HttpContext so ctx.auth.user is typed in every controller
 * and middleware downstream, with no manual casting at call sites.
 */
declare module '@adonisjs/core/http' {
  interface HttpContext {
    auth: {
      user: User
    }
  }
}
