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
