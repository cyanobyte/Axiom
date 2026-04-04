/**
 * Purpose: Configure the live-smoke counter example for local Codex CLI execution.
 * Responsibilities:
 * - Route agent capabilities to CLI-backed providers with structured JSON output.
 * - Keep generated files isolated under the live-smoke example workspace.
 * - Preserve local shell execution for the generated project's self-verifying test command.
 */
export default {
  agents: {
    planner: { provider: "codex-cli", model: "gpt-5.4", output: "json" },
    coder: { provider: "codex-cli", model: "gpt-5.4", output: "json" }
  },
  workspace: {
    root: "./examples/live-counter/generated"
  },
  workers: {
    shell: { type: "local-shell" }
  },
  artifacts: {
    root: "./reports"
  }
};
