/**
 * Purpose: Provide the manual live-smoke example for full MVP acceptance.
 * Responsibilities:
 * - Mirror the beginner counter example in a separate writable workspace.
 * - Keep live CLI-backed generation separate from the deterministic basic example.
 * - Serve as the manual end-to-end acceptance target for a real generated app.
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
    id: "counter-webapp-live",
    meta: {
      title: "Counter Web App Live Smoke",
      summary: "A live-smoke counter app example that generates files into its own workspace.",
      version: "1.0.0",
      tags: ["example", "live", "webapp", "counter"]
    },
    what: {
      capability: "counter_web_application",
      description: "Users can view a counter, increment it, and reset it from a small web UI."
    },
    why: {
      problem: "The MVP needs one real live example that can generate files without mutating the deterministic beginner example.",
      value: "Provides the manual end-to-end acceptance path for the runtime."
    },
    scope: {
      includes: [
        "single counter screen",
        "increment action",
        "reset action",
        "Express backend",
        "generated project files",
        "machine-readable test report"
      ],
      excludes: [
        "authentication",
        "database persistence",
        "complex styling"
      ]
    },
    runtime: {
      languages: ["javascript"],
      targets: ["node", "browser"],
      platforms: ["linux", "macos", "windows", "web"]
    },
    build: {
      system: "npm",
      test_runner: "npm",
      commands: {
        install: "npm install",
        dev: "npm run dev",
        test: "npm test"
      }
    },
    assumptions: [
      "A writable workspace is available for generated files and reports.",
      "The local Codex CLI session is already authenticated for manual live runs.",
      "The generated app will produce reports/counter-ui.json during its test command."
    ],
    architecture: {
      components: [
        {
          id: "counter-ui",
          responsibility: "Render the counter value and expose increment and reset actions."
        },
        {
          id: "counter-api",
          responsibility: "Serve the current count and mutate it through HTTP endpoints."
        },
        {
          id: "counter-store",
          responsibility: "Hold the current counter value in memory."
        }
      ]
    },
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
    quality_attributes: [
      {
        id: "traceable",
        attribute: "traceability",
        priority: "high",
        description: "The live smoke path should clearly show planning, implementation, test, and verification."
      }
    ],
    web: {
      kind: "full-stack",
      frontend: {
        framework: "vanilla",
        styling: "minimal",
        entry: "/"
      },
      api: {
        style: "rest",
        endpoints: [
          { method: "GET", path: "/api/counter", response: { count: "number" } },
          { method: "POST", path: "/api/counter/increment", response: { count: "number" } },
          { method: "POST", path: "/api/counter/reset", response: { count: "number" } }
        ]
      },
      screens: [
        {
          id: "counter-home",
          purpose: "Display the count and increment/reset actions."
        }
      ],
      interactions: [
        "show current count on page load",
        "increment counter",
        "reset counter"
      ]
    },
    constraints: [
      must("must-show-counter", "The app shows the current counter value"),
      must("must-increment-counter", "The app increments the counter from the UI"),
      must("must-reset-counter", "The app resets the counter from the UI"),
      must("must-use-express", "The backend uses Node.js with Express"),
      must("must-return-json-count", "All counter API endpoints return JSON with a count field")
    ],
    outcomes: [
      outcome("counter-loads", "Page load shows count 0"),
      outcome("counter-increments", "Increment changes the visible count from 0 to 1"),
      outcome("counter-resets", "Reset changes the visible count back to 0"),
      outcome("report-is-produced", "The generated project test run produces a machine-readable report")
    ],
    verification: {
      intent: [
        verify("plan-covers-counter-flow", [
          "must-show-counter",
          "must-increment-counter",
          "must-reset-counter",
          "must-use-express",
          "must-return-json-count"
        ])
      ],
      outcome: [
        verify("counter-ui-flow", [
          "counter-loads",
          "counter-increments",
          "counter-resets"
        ]),
        verify("counter-report-exists", [
          "report-is-produced"
        ])
      ]
    }
  },
  async (ctx) => {
    const brief = await ctx.step("brief", () => ({
      title: ctx.intent.meta.title,
      summary: ctx.intent.meta.summary,
      capability: ctx.intent.what.capability,
      constraints: ctx.intent.constraints.map((constraint) => constraint.id),
      outcomes: ctx.intent.outcomes.map((outcomeItem) => outcomeItem.id)
    }));

    const plan = await ctx.step("plan", () =>
      ctx.agent("planner").run({
        prompt: buildJsonContractPrompt(
          `Create a concise implementation plan for this live counter web app.\n\nIntent:\n${JSON.stringify(ctx.intent, null, 2)}\n\nBrief:\n${JSON.stringify(brief, null, 2)}`,
          {
            includesLoadCounter: true,
            includesIncrementCounter: true,
            includesResetCounter: true,
            usesExpress: true,
            returnsJsonCount: true
          }
        )
      })
    );

    await ctx.verify.intent("plan-covers-counter-flow", {
      severity: "error",
      run: async () => ({
        passed:
          plan.includesLoadCounter === true &&
          plan.includesIncrementCounter === true &&
          plan.includesResetCounter === true &&
          plan.usesExpress === true &&
          plan.returnsJsonCount === true,
        evidence: plan
      })
    });

    await ctx.checkpoint.approval("approve-plan", {
      message: "Approve this live counter app plan?",
      data: plan
    });

    const implementation = await ctx.step("implement", () =>
      ctx.agent("coder").run({
        prompt: buildJsonContractPrompt(
          `Generate the minimal files for this live counter web app.\n\nIntent:\n${JSON.stringify(ctx.intent, null, 2)}\n\nPlan:\n${JSON.stringify(plan, null, 2)}\n\nThe reports/counter-ui.json file must be valid JSON with this exact shape:\n{\n  "loads": true,\n  "increments": true,\n  "resets": true\n}`,
          {
            files: [
              {
                path: "package.json",
                content: "string"
              },
              {
                path: "server.js",
                content: "string"
              },
              {
                path: "public/index.html",
                content: "string"
              },
              {
                path: "reports/counter-ui.json",
                content: "string"
              }
            ]
          }
        )
      })
    );

    await materializeFiles(ctx.workspace, implementation?.files ?? []);

    await ctx.step("install", () =>
      ctx.worker("shell").exec({
        command: "npm install",
        cwd: ctx.workspace.root()
      })
    );

    await ctx.step("test", () =>
      ctx.worker("shell").exec({
        command: "npm test",
        cwd: ctx.workspace.root()
      })
    );

    await ctx.verify.outcome("counter-ui-flow", {
      severity: "error",
      run: async () => {
        const report = await ctx.artifact("reports/counter-ui.json");
        return {
          passed:
            report?.loads === true &&
            report?.increments === true &&
            report?.resets === true,
          evidence: report
        };
      }
    });

    await ctx.verify.outcome("counter-report-exists", {
      severity: "error",
      run: async () => {
        const report = await ctx.artifact("reports/counter-ui.json");
        return {
          passed: report != null,
          evidence: report
        };
      }
    });

    return {
      ok: true,
      app: "counter-webapp-live",
      verifiedOutcomes: ctx.verification.summary()
    };
  }
);
