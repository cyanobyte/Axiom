/**
 * Purpose: Show the default sibling runtime configuration shape for an intent file.
 * Responsibilities:
 * - Map named agent capabilities to provider/model selections.
 * - Declare worker and artifact roots outside the authored intent file.
 * - Keep runtime wiring separate from project intent.
 */
export default {
  agents: {
    briefing: {
      provider: "fake",
      responses: {
        briefing: {
          kind: "brief",
          summary: "counter"
        }
      }
    },
    planner: {
      provider: "fake",
      responses: {
        planner: {
          includesLoadCounter: true,
          includesIncrementCounter: true,
          includesResetCounter: true,
          usesExpress: true,
          usesInMemoryState: true,
          returnsJsonCount: true,
          servesSinglePage: true
        }
      }
    },
    coder: {
      provider: "fake",
      responses: {
        coder: {
          generated: true
        }
      }
    }
  },
  workspace: {
    root: "./examples/basic"
  },
  workers: {
    shell: { type: "local-shell" }
  },
  artifacts: {
    root: "./reports"
  }
};
