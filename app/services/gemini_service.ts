import { GoogleGenAI } from '@google/genai'
import geminiConfig from '#config/gemini'

/**
 * Thin wrapper around the Gemini API client.
 *
 * Deliberately generic at this stage - generateText() sends a prompt
 * (with an optional system instruction) and returns raw text. The
 * task-CRUD-specific system prompt and structured-JSON response
 * parsing are added on top of this in a later commit, kept separate
 * so client wiring and prompt design are independently reviewable.
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
}

export default new GeminiService()
