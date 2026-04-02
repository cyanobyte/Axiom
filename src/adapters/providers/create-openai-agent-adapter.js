/**
 * Purpose: Reserve the seam for live OpenAI or Codex-backed agent execution.
 * Responsibilities:
 * - Represent the production provider path in adapter selection.
 * - Validate the minimum provider configuration needed for live execution.
 * - Surface clear errors until live request wiring is implemented.
 * - Keep provider-specific logic out of authored intent files.
 */

/**
 * Create a live provider adapter placeholder for a named capability.
 *
 * @param {string} agentName
 * @param {object} [config={}]
 * @returns {object}
 */
export function createOpenAIAgentAdapter(agentName, config = {}) {
  return {
    async run() {
      if (!config.apiKey) {
        throw new Error(`Missing OpenAI API key for ${agentName}`);
      }

      if (!config.model) {
        throw new Error(`Missing OpenAI model for ${agentName}`);
      }

      throw new Error(`Live provider call not implemented yet for ${agentName}: ${config.model}`);
    }
  };
}
