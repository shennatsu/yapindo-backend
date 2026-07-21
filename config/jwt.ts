import env from '#start/env'

/**
 * Centralized JWT configuration, read once from validated env vars.
 * Consumed by app/services/jwt_service.ts (sign/verify) and, from
 * Commit 8 onward, the JWT authentication middleware.
 */
const jwtConfig = {
  secret: env.get('JWT_SECRET'),
  expiresIn: env.get('JWT_EXPIRES_IN', '1d'),
}

export default jwtConfig
