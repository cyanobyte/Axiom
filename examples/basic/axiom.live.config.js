/**
 * Purpose: Show a live-provider version of the beginner runtime config.
 * Responsibilities:
 * - Demonstrate CLI-backed agent configuration for manual smoke runs.
 * - Keep the default deterministic example config unchanged for automated tests.
 * - Reuse the user's local Codex session instead of requiring a separate API key.
 */
export default {
  agents: {
    briefing: { provider: 'codex-cli', model: 'gpt-5.4' },
    planner: { provider: 'codex-cli', model: 'gpt-5.4' },
    coder: { provider: 'codex-cli', model: 'gpt-5.4-codex' }
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
