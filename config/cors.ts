import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/cors'

/**
 * Resolves the allowed CORS origins from the CORS_ORIGIN env variable
 * (a comma-separated list, e.g. "https://app.example.com,https://admin.example.com").
 *
 * Falls back to a sane per-environment default when the variable is unset:
 * - development: reflect any origin, so local frontend/API-client setups work
 *   without extra configuration.
 * - production/test: block all cross-origin browser access until an
 *   allowlist is explicitly configured.
 */
function resolveAllowedOrigins(): boolean | string[] {
  const configuredOrigins = env.get('CORS_ORIGIN')

  if (!configuredOrigins) {
    return app.inDev
  }

  return configuredOrigins.split(',').map((origin) => origin.trim())
}

/**
 * Configuration options to tweak the CORS policy. The following
 * options are documented on the official documentation website.
 *
 * https://docs.adonisjs.com/guides/security/cors
 */
const corsConfig = defineConfig({
  /**
   * Enable or disable CORS handling globally.
   */
  enabled: true,

  /**
   * Allowed origins, resolved from the CORS_ORIGIN env variable.
   * See `resolveAllowedOrigins` above for the fallback behavior.
   */
  origin: resolveAllowedOrigins(),

  /**
   * HTTP methods accepted for cross-origin requests.
   */
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],

  /**
   * Reflect request headers by default. Use a string array to restrict
   * allowed headers.
   */
  headers: true,

  /**
   * Response headers exposed to the browser.
   */
  exposeHeaders: [],

  /**
   * Allow cookies/authorization headers on cross-origin requests.
   */
  credentials: true,

  /**
   * Cache CORS preflight response for N seconds.
   */
  maxAge: 90,
})

export default corsConfig
