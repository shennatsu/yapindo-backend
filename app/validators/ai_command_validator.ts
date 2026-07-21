import vine from '@vinejs/vine'

/**
 * Validates POST /ai/command request bodies.
 *
 * maxLength exists specifically to bound the cost/DOS surface of
 * this endpoint - every request here triggers a real Gemini API
 * call, so an unbounded prompt is an unbounded-cost request.
 */
export const aiCommandValidator = vine.compile(
  vine.object({
    prompt: vine.string().trim().minLength(1).maxLength(2000),
  })
)
