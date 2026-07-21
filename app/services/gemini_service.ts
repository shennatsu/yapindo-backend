import { GoogleGenAI } from '@google/genai'
import geminiConfig from '#config/gemini'

/**
 * Thin wrapper around the Gemini API client.
 */
class GeminiService {
  #client = new GoogleGenAI({ apiKey: geminiConfig.apiKey })

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    const response = await this.#client.models.generateContent({
      model: geminiConfig.model,
      contents: prompt,
      config: systemInstruction ? { systemInstruction } : undefined,
    })

    return response.text ?? ''
  }

  /**
   * Sends a prompt constrained to a specific JSON output shape via
   * Gemini's native structured-output mode, and parses the result.
   *
   * systemInstruction is passed as its own dedicated API config
   * field, never concatenated into `contents` - the system/user
   * role boundary is enforced by the API itself, which is a
   * meaningfully stronger guarantee than string concatenation.
   *
   * temperature is fixed at 0 for this call specifically (not a
   * GeminiService-wide default) - structured extraction benefits
   * from deterministic output, unlike free-text generation.
   *
   * Note: JSON.parse below is not yet wrapped in the graceful
   * degrade-to-400 handling the AI Command feature ultimately needs
   * for a malformed/truncated response - that's added by the caller
   * in the response validator, kept as its own commit.
   */
  async generateStructuredJson<T>(
    prompt: string,
    systemInstruction: string,
    responseSchema: object
  ): Promise<T> {
    const response = await this.#client.models.generateContent({
      model: geminiConfig.model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0,
      },
    })

    return JSON.parse(response.text ?? '') as T
  }
}

export default new GeminiService()
