/**
 * Purpose: Build explicit output-shape prompts for live provider calls.
 * Responsibilities:
 * - Append JSON-only instructions to free-form generation prompts.
 * - Show the exact object shape expected by runtime consumers.
 * - Keep output-contract formatting shared across authored examples.
 */

/**
 * Build a prompt that asks a provider to return only valid JSON.
 *
 * @param {string} instructions
 * @param {object} shape
 * @returns {string}
 */
export function buildJsonContractPrompt(instructions, shape) {
  return [
    instructions,
    '',
    'Return only valid JSON. Do not include markdown, prose, or code fences.',
    'Expected shape:',
    JSON.stringify(shape, null, 2)
  ].join('\n');
}
