/**
 * Purpose: Configure the Docker live-smoke counter example for Codex CLI execution.
 * Responsibilities:
 * - Route agent capabilities to CLI-backed providers with structured JSON output inside Docker.
 * - Keep generated files isolated under the Docker Codex example workspace.
 * - Preserve shell execution for the generated project's self-verifying test command.
 */
export default {
  agents: {
    planner: { provider: "codex-cli", model: "gpt-5.4", output: "json" },
    coder: { provider: "codex-cli", model: "gpt-5.4", output: "json" }
  },
  workspace: {
    root: "./examples/docker-codex-counter/generated"
  },
  workers: {
    shell: { type: "local-shell" }
  },
  artifacts: {
    root: "./reports"
  }
};
