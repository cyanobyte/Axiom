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

/**
 * Build a structured JSON prompt with optional structured context.
 *
 * @param {object} spec
 * @param {string} spec.instructions
 * @param {object} [spec.context]
 * @param {object} spec.shape
 * @returns {string}
 */
export function buildStructuredJsonPrompt({ instructions, context = {}, shape }) {
  const sections = [instructions];

  for (const [label, value] of Object.entries(context)) {
    sections.push(`${label[0].toUpperCase()}${label.slice(1)}:`);
    sections.push(JSON.stringify(value, null, 2));
  }

  return buildJsonContractPrompt(sections.join('\n\n'), shape);
}

/**
 * Build a file-generation prompt with optional structured context.
 *
 * @param {object} spec
 * @param {string} spec.instructions
 * @param {object} [spec.context]
 * @param {object[]} spec.files
 * @returns {string}
 */
export function buildFileGenerationPrompt({ instructions, context = {}, files }) {
  return buildStructuredJsonPrompt({
    instructions,
    context,
    shape: { files }
  });
}
