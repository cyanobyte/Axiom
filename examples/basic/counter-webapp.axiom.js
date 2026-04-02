import {
  intent,
  must,
  outcome,
  verify
} from "@science451/intent-runtime";

export default intent(
  {
    id: "counter-webapp-basic",

    // Basic project identity
    meta: {
      title: "Counter Web App",
      summary: "A tiny full-stack web app that increments and resets a counter.",
      version: "1.0.0",
      tags: ["example", "basic", "webapp", "counter"]
    },

    // What the software does
    what: {
      capability: "counter_web_application",
      description: "Users can view a counter, increment it, and reset it from a small web UI."
    },

    // Why this example exists
    why: {
      problem: "New users need one small example that shows the runtime flow without full application complexity.",
      value: "Demonstrates intent, planning, approval, implementation, testing, and verification in one short file."
    },

    // Scope boundaries
    scope: {
      includes: [
        "single counter screen",
        "increment action",
        "reset action",
        "human plan approval",
        "machine-readable test report"
      ],
      excludes: [
        "authentication",
        "database persistence",
        "multiple screens",
        "complex styling"
      ]
    },

    // Runtime language and platform
    runtime: {
      languages: ["javascript"],
      targets: ["node", "browser"],
      platforms: ["linux", "macos", "windows", "web"]
    },

    // Build and test toolchain
    build: {
      system: "npm",
      test_runner: "npm"
    },

    // Minimal operating assumptions
    assumptions: [
      "A writable workspace is available for generated files and test reports.",
      "The user reviews the implementation plan before generation continues.",
      "The runtime environment provides explicit AI, shell, workspace, and artifact capabilities."
    ],

    // Major system parts
    architecture: {
      components: [
        {
          id: "counter-ui",
          responsibility: "Render the counter value and expose increment and reset actions."
        },
        {
          id: "counter-api",
          responsibility: "Serve the current count and handle increment and reset requests."
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
        description: "The example should be short enough for a new user to understand quickly."
      },
      {
        id: "traceable",
        attribute: "traceability",
        priority: "high",
        description: "The run should clearly show where planning, approval, testing, and verification occur."
      }
    ],

    // Domain-specific web app structure
    web: {
      kind: "full-stack",
      frontend: {
        framework: "vanilla",
        styling: "minimal"
      },
      api: {
        style: "rest",
        endpoints: [
          { method: "GET", path: "/api/counter" },
          { method: "POST", path: "/api/counter/increment" },
          { method: "POST", path: "/api/counter/reset" }
        ]
      },
      interactions: [
        "show current count",
        "increment counter",
        "reset counter"
      ]
    },

    // Hard requirements
    constraints: [
      must("must-show-counter", "The app shows the current counter value"),
      must("must-increment-counter", "The app increments the counter from the UI"),
      must("must-reset-counter", "The app resets the counter from the UI")
    ],

    // User-visible success conditions
    outcomes: [
      outcome("counter-loads", "The current counter value loads in the UI"),
      outcome("counter-increments", "The user can increment the counter"),
      outcome("counter-resets", "The user can reset the counter"),
      outcome("report-is-produced", "The test run produces a machine-readable report")
    ],

    // Declare what must be proved; runtime code supplies how
    verification: {
      intent: [
        verify("plan-covers-counter-flow", [
          "must-show-counter",
          "must-increment-counter",
          "must-reset-counter"
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
    // Turn the declarative intent into a short implementation brief
    const brief = await ctx.step("brief", () =>
      ctx.agent("briefing").run({
        intent: ctx.intent
      })
    );

    // Produce a plan from the brief
    const plan = await ctx.step("plan", () =>
      ctx.agent("planner").run({
        intent: ctx.intent,
        brief
      })
    );

    // Prove the plan covers the basic counter behavior
    await ctx.verify.intent("plan-covers-counter-flow", {
      severity: "error",
      run: async () => ({
        passed:
          plan.includesLoadCounter === true &&
          plan.includesIncrementCounter === true &&
          plan.includesResetCounter === true,
        evidence: plan
      })
    });

    // Human gate before code generation
    await ctx.checkpoint.approval("approve-plan", {
      message: "Approve this counter app plan?",
      data: plan
    });

    // Generate the tiny app implementation
    await ctx.step("implement", () =>
      ctx.agent("coder").run({
        intent: ctx.intent,
        plan
      })
    );

    // Run the generated tests
    await ctx.step("test", () =>
      ctx.worker("shell").exec({
        command: "npm test",
        cwd: ctx.workspace.root()
      })
    );

    // Prove the generated app behavior from a machine-readable report
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

    // Return a small structured summary
    return {
      ok: true,
      app: "counter-webapp",
      verifiedOutcomes: ctx.verification.summary()
    };
  }
);
