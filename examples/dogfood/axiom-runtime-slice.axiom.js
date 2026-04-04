/**
 * Purpose: Provide the first safe dogfooding path for an Axiom-targeted slice.
 * Responsibilities:
 * - Exercise Axiom against a small runtime-adjacent target.
 * - Keep all generated output isolated from the real source tree.
 * - Model the shape of refining an `ax init --existing .` starting point.
 */
import {
  intent,
  must,
  outcome,
  verify
} from "@science451/intent-runtime";

export default intent(
  {
    id: "axiom-runtime-slice",
    meta: {
      title: "Axiom Runtime Slice",
      summary: "A small deterministic dogfood example that generates a runtime-adjacent helper into an isolated workspace.",
      version: "1.0.0",
      tags: ["example", "dogfood", "axiom", "runtime", "slice"]
    },

    what: {
      capability: "axiom_runtime_slice",
      description: "Generate a tiny runtime-adjacent helper and focused test without mutating the real Axiom source tree."
    },

    why: {
      problem: "Axiom needs a safe first dogfooding path before it can evolve larger Axiom-targeted slices.",
      value: "Proves that Axiom can describe and build a small Axiom-adjacent artifact in an isolated workspace."
    },

    scope: {
      includes: [
        "one runtime-adjacent helper module",
        "one focused test file",
        "isolated generated workspace",
        "machine-readable verification report"
      ],
      excludes: [
        "mutation of the real src tree",
        "self-hosting rewrite",
        "live provider dependency"
      ]
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

    library: {
      kind: "package",
      public_api: [
        "createRuntimeSliceSummary(input)"
      ]
    },

    constraints: [
      must("must-define-runtime-slice-helper", "The generated slice defines a runtime-adjacent helper module"),
      must("must-include-focused-test", "The generated slice includes a focused test for the helper"),
      must("must-stay-isolated", "Generated output stays inside the dedicated dogfood workspace")
    ],

    outcomes: [
      outcome("runtime-slice-generated", "The runtime slice files are generated into the isolated workspace"),
      outcome("runtime-slice-report-produced", "The run produces a machine-readable verification report")
    ],

    verification: {
      intent: [
        verify("plan-covers-runtime-slice", [
          "must-define-runtime-slice-helper",
          "must-include-focused-test",
          "must-stay-isolated"
        ])
      ],
      outcome: [
        verify("runtime-slice-flow", [
          "runtime-slice-generated",
          "runtime-slice-report-produced"
        ])
      ]
    }
  },

  async (ctx) => {
    const brief = await ctx.step("brief", () => ctx.generate.brief());

    const plan = await ctx.step("plan", () =>
      ctx.generate.plan({
        instructions: "Create a concise implementation plan for this isolated Axiom runtime slice.",
        context: {
          intent: ctx.intent,
          brief
        },
        shape: {
          definesHealthSummaryHelper: true,
          exportsNamedHelper: true,
          includesFocusedTest: true
        }
      })
    );

    await ctx.verify.intentShape("plan-covers-runtime-slice", {
      value: plan,
      expected: {
        definesHealthSummaryHelper: true,
        exportsNamedHelper: true,
        includesFocusedTest: true
      }
    });

    await ctx.checkpoint.approvePlan(plan, "Approve this dogfood runtime slice plan?");

    const implementation = await ctx.step("implement", () =>
      ctx.generate.files({
        instructions: "Generate the minimal files for this isolated Axiom runtime slice.",
        context: {
          intent: ctx.intent,
          plan
        },
        files: [
          {
            path: "src/create-runtime-slice-summary.js",
            content: "string"
          },
          {
            path: "test/create-runtime-slice-summary.test.js",
            content: "string"
          },
          {
            path: "package.json",
            content: "string"
          }
        ]
      })
    );

    await ctx.materialize.files(implementation?.files ?? []);

    await ctx.step("test", () =>
      ctx.worker("shell").exec({
        command: "npm test",
        cwd: ctx.workspace.root()
      })
    );

    await ctx.verify.outcomeReport("runtime-slice-flow", {
      path: "reports/runtime-slice.json",
      passes(report) {
        return (
          report?.exportsCreateHealthSummary === true &&
          report?.includesHealthStatus === true
        );
      }
    });

    return {
      ok: true,
      app: "axiom-runtime-slice",
      verifiedOutcomes: ctx.verification.summary()
    };
  }
);
