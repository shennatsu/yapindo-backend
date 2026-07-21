import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { UserRole } from '#enums/user_role'

/**
 * Restricts a route to a specific set of roles.
 *
 * MUST run after the `auth` middleware (Commit 8) on any route that
 * uses it - this middleware reads ctx.auth.user and does not verify
 * the token itself. Route registration order matters:
 *
 *   router.post('/projects', [...]).use([middleware.auth(), middleware.role(['admin'])])
 *
 * Returns 403 (not 401) on mismatch: identity is already known at
 * this point, only privilege is insufficient.
 */
export default class RoleMiddleware {
  async handle(ctx: HttpContext, next: NextFn, allowedRoles: UserRole[]) {
    const { auth, response } = ctx

    if (!allowedRoles.includes(auth.user.role)) {
      return response.forbidden({ message: 'You do not have permission to perform this action' })
    }

    return next()
  }
}
