/**
 * Purpose: Show the default sibling runtime configuration shape for an intent file.
 * Responsibilities:
 * - Map named agent capabilities to provider/model selections.
 * - Declare worker and artifact roots outside the authored intent file.
 * - Keep runtime wiring separate from project intent.
 */
export default {
  agents: {
    briefing: { provider: "claude", model: "sonnet" },
    planner: { provider: "codex", model: "gpt-5.4" },
    coder: { provider: "codex", model: "gpt-5.4-codex" }
  },
  workers: {
    shell: { type: "local-shell" }
  },
  artifacts: {
    root: "./reports"
  }
};
