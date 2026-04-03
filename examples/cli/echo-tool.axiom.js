/**
 * Purpose: Demonstrate a minimal Axiom-authored CLI tool.
 * Responsibilities:
 * - Show the compiler loop for a non-web target.
 * - Keep the generated workspace isolated from the authored source.
 * - Provide a second runnable example for acceptance coverage.
 */
import {
  intent,
  must,
  outcome,
  verify
} from "@science451/intent-runtime";
import { materializeFiles } from "../../src/runtime/materialize-files.js";
import { buildJsonContractPrompt } from "../../src/runtime/output-contracts.js";

export default intent(
  {
    id: "echo-tool-cli",

    // Basic project identity
    meta: {
      title: "Echo Tool",
      summary: "A tiny CLI that prints the provided message and reports missing input clearly.",
      version: "1.0.0",
      tags: ["example", "cli", "echo", "basic"]
    },

    // What the software does
    what: {
      capability: "echo_cli_tool",
      description: "Users can run a command that prints the provided message."
    },

    // Why this example exists
    why: {
      problem: "The runtime needs a second runnable example that is simpler than a web app.",
      value: "Demonstrates the same compile, test, and verify loop for a small CLI target."
    },

    // Scope boundaries
    scope: {
      includes: [
        "single echo command",
        "one required positional argument",
        "clear missing-argument usage error",
        "human plan approval",
        "machine-readable test report"
      ],
      excludes: [
        "subcommands",
        "configuration files",
        "multiple output formats"
      ]
    },

    // Runtime language and platform
    runtime: {
      languages: ["javascript"],
      targets: ["node"],
      platforms: ["linux", "macos", "windows"]
    },

    // Build and test toolchain
    build: {
      system: "npm",
      test_runner: "npm",
      commands: {
        install: "npm install",
        test: "npm test"
      }
    },

    // Minimal operating assumptions
    assumptions: [
      "A writable workspace is available for generated files and reports.",
      "The user reviews the generated plan before implementation continues.",
      "The runtime environment provides explicit AI, shell, workspace, and artifact capabilities."
    ],

    // Major system parts
    architecture: {
      components: [
        {
          id: "echo-command",
          responsibility: "Print the provided message to stdout."
        },
        {
          id: "argument-validation",
          responsibility: "Reject missing input with a clear usage message."
        }
      ]
    },

    // Runtime and workflow rules
    policies: [
      {
        id: "plan-must-be-approved",
        rule: "Implementation must not begin until the generated plan is approved.",
        severity: "error"
      },
      {
        id: "verification-must-be-explicit",
        rule: "Verification must execute by statically declared verification ID.",
        severity: "error"
      }
    ],

    // Qualities this example should demonstrate
    quality_attributes: [
      {
        id: "readable",
        attribute: "simplicity",
        priority: "high",
        description: "The example should show the compiler loop with as little noise as possible."
      },
      {
        id: "portable",
        attribute: "predictability",
        priority: "high",
        description: "The generated CLI behavior should be easy to reason about from the intent file."
      }
    ],

    // Domain-specific CLI structure
    cli: {
      command: "echo-tool",
      arguments: ["<message>"],
      subcommands: [],
      behaviors: [
        "prints the provided message to stdout",
        "shows a usage error when the message is missing"
      ]
    },

    // Hard requirements
    constraints: [
      must("must-print-message", "The tool prints the provided message"),
      must("must-reject-missing-message", "The tool rejects a missing message with a clear error"),
      must("must-use-node-cli", "The tool runs as a Node.js CLI")
    ],

    // User-visible success conditions
    outcomes: [
      outcome("prints-message", "Running the command with a message prints that message"),
      outcome("rejects-missing-message", "Running the command without a message shows a clear usage error"),
      outcome("report-is-produced", "The test run produces a machine-readable report")
    ],

    // Declare what must be proved; runtime code supplies how
    verification: {
      intent: [
        verify("plan-covers-echo-flow", [
          "must-print-message",
          "must-reject-missing-message",
          "must-use-node-cli"
        ])
      ],
      outcome: [
        verify("echo-cli-flow", [
          "prints-message",
          "rejects-missing-message"
        ]),
        verify("echo-report-exists", [
          "report-is-produced"
        ])
      ]
    }
  },

  async (ctx) => {
    // Turn the declarative intent into a short implementation brief
    const brief = await ctx.step("brief", () =>
      ctx.agent("briefing").run({
        intent: ctx.intent
      })
    );

    // Produce a plan from the brief
    const plan = await ctx.step("plan", () =>
      ctx.agent("planner").run({
        prompt: buildJsonContractPrompt(
          `Create a concise implementation plan for this echo CLI tool.\n\nIntent:\n${JSON.stringify(ctx.intent, null, 2)}\n\nBrief:\n${JSON.stringify(brief, null, 2)}`,
          {
            includesPrintMessage: true,
            includesMissingArgumentError: true,
            usesNodeCli: true
          }
        )
      })
    );

    // Prove the plan covers the declared CLI behavior
    await ctx.verify.intent("plan-covers-echo-flow", {
      severity: "error",
      run: async () => ({
        passed:
          plan.includesPrintMessage === true &&
          plan.includesMissingArgumentError === true &&
          plan.usesNodeCli === true,
        evidence: plan
      })
    });

    // Pause for human approval before generation
    await ctx.checkpoint.approval("approve-plan", {
      message: "Approve this echo tool plan?",
      data: plan
    });

    // Generate the CLI files and write them into the isolated workspace
    const implementation = await ctx.step("implement", () =>
      ctx.agent("coder").run({
        prompt: buildJsonContractPrompt(
          `Generate the minimal files for this echo CLI tool.\n\nIntent:\n${JSON.stringify(ctx.intent, null, 2)}\n\nPlan:\n${JSON.stringify(plan, null, 2)}`,
          {
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
          }
        )
      })
    );

    await materializeFiles(ctx.workspace, implementation?.files ?? []);

    // Run the generated test command
    await ctx.step("test", () =>
      ctx.worker("shell").exec({
        command: "npm test",
        cwd: ctx.workspace.root()
      })
    );

    // Verify the tracked fixture report matches the declared outcomes
    await ctx.verify.outcome("echo-cli-flow", {
      severity: "error",
      run: async () => {
        const report = await ctx.artifact("reports/echo-tool.json");
        return {
          passed:
            report?.printsMessage === true &&
            report?.rejectsMissingMessage === true,
          evidence: report
        };
      }
    });

    await ctx.verify.outcome("echo-report-exists", {
      severity: "error",
      run: async () => {
        const report = await ctx.artifact("reports/echo-tool.json");
        return {
          passed: Boolean(report),
          evidence: report
        };
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
