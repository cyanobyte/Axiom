/**
 * Purpose: Demonstrate a minimal Axiom-authored CLI tool.
 * Responsibilities:
 * - Show the compiler loop for a non-web target.
 * - Keep the generated workspace isolated from the authored source.
 * - Provide a second runnable example for acceptance coverage.
 */
import {
  intent
} from "@science451/intent-runtime";

export default intent(
  {
    meta: {
      title: "Echo Tool",
      summary: "A tiny CLI that prints the provided message and reports missing input clearly."
    },

    what: {
      capability: "echo_cli_tool",
      description: "Users can run a command that prints the provided message."
    },

    runtime: {
      languages: ["javascript"],
      targets: ["node"],
      platforms: ["linux", "macos", "windows"]
    },

    build: {
      system: "npm",
      test_runner: "npm",
      commands: {
        install: "npm install",
        test: "npm test"
      }
    },

    cli: {
      command: "echo-tool",
      arguments: ["<message>"],
      subcommands: [],
      behaviors: [
        "prints the provided message to stdout",
        "shows a usage error when the message is missing"
      ]
    }
  },

  async (ctx) => {
    // Turn the declarative intent into a short implementation brief
    const brief = await ctx.step("brief", () => ctx.generate.brief());

    // Produce a plan from the brief
    const plan = await ctx.step("plan", () =>
      ctx.generate.plan({
        instructions: "Create a concise implementation plan for this echo CLI tool.",
        context: {
          intent: ctx.intent,
          brief
        },
        shape: {
          includesPrintMessage: true,
          includesMissingArgumentError: true,
          usesNodeCli: true
        }
      })
    );

    // Prove the plan covers the declared CLI behavior
    await ctx.verify.intentShape("plan-covers-cli-flow", {
      value: plan,
      expected: {
        includesPrintMessage: true,
        includesMissingArgumentError: true,
        usesNodeCli: true
      }
    });

    // Pause for human approval before generation
    await ctx.checkpoint.approvePlan(plan, "Approve this echo tool plan?");

    // Generate the CLI files and write them into the isolated workspace
    const implementation = await ctx.step("implement", () =>
      ctx.generate.files({
        instructions: "Generate the minimal files for this echo CLI tool.",
        context: {
          intent: ctx.intent,
          plan
        },
        files: [
          {
            path: "package.json",
            content: "string"
          },
          {
            path: "bin/echo-tool.js",
            content: "string"
          }
        ]
      })
    );

    await ctx.materialize.files(implementation?.files ?? []);

    // Run the generated test command
    await ctx.step("test", () =>
      ctx.worker("shell").exec({
        command: "npm test",
        cwd: ctx.workspace.root()
      })
    );

    // Verify the tracked fixture report matches the declared outcomes
    await ctx.verify.outcomeReport("cli-flow", {
      path: "reports/echo-tool.json",
      passes(report) {
        return (
          report?.printsMessage === true &&
          report?.rejectsMissingMessage === true
        );
      }
    });

    // Return the final structured run result
    return {
      ok: true,
      app: "echo-tool",
      verifiedOutcomes: ctx.verification.summary()
    };
  }
);
