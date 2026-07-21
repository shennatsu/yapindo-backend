import jwt from 'jsonwebtoken'
import jwtConfig from '#config/jwt'
import type { UserRole } from '#enums/user_role'

/**
 * Payload embedded in every issued token. Deliberately minimal -
 * only what downstream middleware needs to authorize a request
 * without reloading the full user record for every check.
 */
export interface JwtPayload {
  userId: number
  role: UserRole
}

/**
 * Thin wrapper around jsonwebtoken, centralizing sign/verify so both
 * concerns share one secret, one expiry, and one payload shape.
 * sign() is used by the login endpoint (Commit 7); verify() is used
 * by the JWT authentication middleware (Commit 8).
 */
class JwtService {
  sign(payload: JwtPayload): string {
    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
    } as jwt.SignOptions)
  }

  verify(token: string): JwtPayload {
    return jwt.verify(token, jwtConfig.secret) as JwtPayload
  }
}

export default new JwtService()
