/**
 * Purpose: Provide deterministic agent behavior for tests and local fixtures.
 * Responsibilities:
 * - Return configured fake responses by capability name.
 * - Echo inputs when no explicit fake response is configured.
 * - Keep automated tests free of live model calls.
 */

/**
 * Create a fake agent adapter for a named capability.
 *
 * @param {string} agentName
 * @param {object} [config={}]
 * @returns {object}
 */
export function createFakeAgentAdapter(agentName, config = {}) {
  return {
    async run(input) {
      if (config.responses?.[agentName] !== undefined) {
        return config.responses[agentName];
      }

      return input;
    }
  };
}
