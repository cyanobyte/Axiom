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
