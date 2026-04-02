export function createOpenAIAgentAdapter(agentName, config = {}) {
  return {
    async run() {
      throw new Error(`Live provider not yet configured for ${agentName}: ${config.model ?? 'unknown-model'}`);
    }
  };
}
