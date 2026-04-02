/**
 * Purpose: Parse structured JSON responses from provider CLI stdout.
 * Responsibilities:
 * - Convert provider output text into runtime objects.
 * - Fail clearly when a structured-output provider returns invalid text.
 * - Keep JSON parsing behavior shared across CLI-backed providers.
 */

/**
 * Parse JSON provider output into a runtime value.
 *
 * @param {string} output
 * @param {string} [agentName='agent']
 * @returns {unknown}
 */
export function parseJsonOutput(output, agentName = 'agent') {
  try {
    return JSON.parse(output.trim());
  } catch {
    throw new Error(`Provider output for ${agentName} was not valid JSON`);
  }
}
