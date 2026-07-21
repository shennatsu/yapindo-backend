import env from '#start/env'

/**
 * Centralized Gemini API configuration, read once from validated env
 * vars. Consumed by app/services/gemini_service.ts.
 */
const geminiConfig = {
  apiKey: env.get('GEMINI_API_KEY'),
  model: env.get('GEMINI_MODEL', 'gemini-2.0-flash'),
}

export default geminiConfig
