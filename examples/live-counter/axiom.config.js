/**
 * Purpose: Configure the live-smoke counter example for local Codex CLI execution.
 * Responsibilities:
 * - Route agent capabilities to CLI-backed providers with structured JSON output.
 * - Keep generated files isolated under the live-smoke example workspace.
 * - Preserve local shell execution for the generated project's test command.
 */
export default {
  agents: {
    briefing: { provider: "codex-cli", model: "gpt-5.4" },
    planner: { provider: "codex-cli", model: "gpt-5.4", output: "json" },
    coder: { provider: "codex-cli", model: "gpt-5.4-codex", output: "json" }
  },
  workspace: {
    root: "./examples/live-counter"
  },
  workers: {
    shell: { type: "local-shell" }
  },
  artifacts: {
    root: "./reports"
  }
};
