/**
 * Purpose: Show a live-provider version of the beginner runtime config.
 * Responsibilities:
 * - Demonstrate provider-backed agent configuration for manual smoke runs.
 * - Keep the default deterministic example config unchanged for automated tests.
 * - Document the environment variable shape expected by the live adapter path.
 */
export default {
  agents: {
    briefing: { provider: 'openai', model: 'gpt-5.4', apiKey: process.env.OPENAI_API_KEY },
    planner: { provider: 'openai', model: 'gpt-5.4', apiKey: process.env.OPENAI_API_KEY },
    coder: { provider: 'openai', model: 'gpt-5.4-codex', apiKey: process.env.OPENAI_API_KEY }
  },
  workspace: {
    root: './examples/basic'
  },
  workers: {
    shell: { type: 'local-shell' }
  },
  artifacts: {
    root: './reports'
  }
};
