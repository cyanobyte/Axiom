/**
 * Purpose: Configure the first safe dogfood example with deterministic adapters.
 * Responsibilities:
 * - Keep the dogfood runtime slice runnable in automated tests.
 * - Route generated files into an isolated dogfood workspace.
 * - Point verification at a stable fixture report for deterministic outcome checks.
 */
export default {
  agents: {
    briefing: {
      provider: "fake",
      responses: {
        briefing: {
          kind: "brief",
          summary: "runtime slice"
        }
      }
    },
    planner: {
      provider: "fake",
      responses: {
        planner: {
          definesHealthSummaryHelper: true,
          exportsNamedHelper: true,
          includesFocusedTest: true
        }
      }
    },
    coder: {
      provider: "fake",
      responses: {
        coder: {
          files: [
            {
              path: "src/create-runtime-slice-summary.js",
              content: "export function createRuntimeSliceSummary() { return { status: 'ok' }; }\n"
            },
            {
              path: "test/create-runtime-slice-summary.test.js",
              content: "console.log('runtime slice test');\n"
            },
            {
              path: "package.json",
              content: "{\n  \"name\": \"axiom-runtime-slice\",\n  \"private\": true,\n  \"scripts\": {\n    \"test\": \"node -e \\\"const fs=require('fs');fs.mkdirSync('reports',{recursive:true});fs.writeFileSync('reports/runtime-slice.json', JSON.stringify({exportsCreateHealthSummary:true,includesHealthStatus:true}, null, 2)+'\\\\n');\\\"\"\n  }\n}\n"
            }
          ]
        }
      }
    }
  },
  workspace: {
    root: "./examples/dogfood/generated"
  },
  workers: {
    shell: { type: "fake-shell" }
  },
  artifacts: {
    root: "../reports"
  }
};
