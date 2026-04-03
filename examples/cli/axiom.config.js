/**
 * Purpose: Provide deterministic runtime wiring for the echo tool example.
 * Responsibilities:
 * - Keep provider mapping outside the authored intent file.
 * - Route generated files into an isolated workspace.
 * - Point verification at a stable fixture report for automated tests.
 */
export default {
  agents: {
    briefing: {
      provider: "fake",
      responses: {
        briefing: {
          kind: "brief",
          summary: "echo tool"
        }
      }
    },
    planner: {
      provider: "fake",
      responses: {
        planner: {
          includesPrintMessage: true,
          includesMissingArgumentError: true,
          usesNodeCli: true
        }
      }
    },
    coder: {
      provider: "fake",
      responses: {
        coder: {
          files: [
            {
              path: "package.json",
              content: "{\n  \"name\": \"echo-tool\",\n  \"version\": \"1.0.0\",\n  \"type\": \"module\",\n  \"bin\": {\n    \"echo-tool\": \"bin/echo-tool.js\"\n  },\n  \"scripts\": {\n    \"test\": \"node bin/echo-tool.js hello\"\n  }\n}"
            },
            {
              path: "bin/echo-tool.js",
              content: "#!/usr/bin/env node\nconst message = process.argv[2];\n\nif (!message) {\n  console.error('Usage: echo-tool <message>');\n  process.exit(1);\n}\n\nconsole.log(message);\n"
            }
          ]
        }
      }
    }
  },
  workspace: {
    root: "./examples/cli/generated"
  },
  workers: {
    shell: { type: "fake-shell" }
  },
  artifacts: {
    root: "../reports"
  }
};
