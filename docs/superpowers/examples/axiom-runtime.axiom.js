import {
  intent,
  must,
  should,
  outcome,
  verify
} from "@science451/intent-runtime";

export default intent(
  {
    id: "axiom-runtime-mvp",

    meta: {
      title: "Axiom Runtime MVP",
      summary: "A library that executes a single user-authored intent file to drive AI-assisted project generation and verification.",
      version: "0.1.0",
      tags: ["axiom", "runtime", "library", "node", "mvp"]
    },

    what: {
      capability: "intent_runtime_library",
      description: "A human authors one .axiom.js file and Axiom executes it top-to-bottom with checkpoints, verification, and rerun-safe intent revision."
    },

    why: {
      problem: "Markdown specs are descriptive but not executable, enforceable, or directly verifiable.",
      value: "Axiom turns declared project intent into structured runtime behavior, AI orchestration, and concrete proof."
    },

    scope: {
      includes: [
        "single-file intent authoring",
        "validated intent definition",
        "top-to-bottom JavaScript workflow execution",
        "human approval checkpoints",
        "human choice and input checkpoints",
        "verification by declared IDs",
        "intent revision proposal plus rerun boundary",
        "explicit adapter-driven runtime integration",
        "structured run result reporting"
      ],
      excludes: [
        "multi-file intent composition",
        "custom live debugger",
        "implicit default adapters",
        "complex actor hierarchies",
        "plugin marketplace support",
        "hidden scheduler semantics"
      ]
    },

    runtime: {
      languages: ["javascript"],
      targets: ["node"],
      platforms: ["linux", "macos", "windows"]
    },

    build: {
      system: "npm",
      test_runner: "vitest"
    },

    assumptions: [
      "A human programmer authors and reviews the intent file.",
      "The runtime may collaborate with one AI system through explicit runtime capabilities.",
      "The current run ends when intent is revised and the revised intent only takes effect after rerun.",
      "Adapters are provided explicitly by the runtime environment rather than inferred implicitly.",
      "Generated files and reports are stored in a managed writable workspace."
    ],

    architecture: {
      components: [
        {
          id: "definition-validator",
          responsibility: "Validate and freeze the declarative intent definition."
        },
        {
          id: "runtime-engine",
          responsibility: "Execute the workflow callback top-to-bottom and manage step lifecycle."
        },
        {
          id: "checkpoint-system",
          responsibility: "Pause for human approval, input, or choice and resume safely."
        },
        {
          id: "verification-system",
          responsibility: "Execute verification logic against declared verification IDs and collect evidence."
        },
        {
          id: "adapter-boundary",
          responsibility: "Provide explicit access to AI, shell, workspace, and artifact capabilities through runtime-managed interfaces."
        },
        {
          id: "workspace-system",
          responsibility: "Manage generated files, reports, and traceable workspace mutations."
        },
        {
          id: "revision-system",
          responsibility: "Propose intent file edits and enforce the rerun boundary."
        }
      ]
    },

    policies: [
      {
        id: "two-real-actors-only",
        rule: "V1 models only the human programmer and the AI collaborator as real actors.",
        severity: "error"
      },
      {
        id: "verification-must-be-declared",
        rule: "Runtime verification must reference statically declared verification IDs.",
        severity: "error"
      },
      {
        id: "intent-must-be-passed-as-validated-struct",
        rule: "Runtime steps should use ctx.intent as the validated high-level intent object by default rather than rebuilding partial payloads field by field.",
        severity: "warn"
      },
      {
        id: "intent-revision-requires-rerun",
        rule: "Approved intent changes do not affect the current run and require a rerun from source.",
        severity: "error"
      },
      {
        id: "adapters-must-be-explicit",
        rule: "AI, shell, workspace, and artifact capabilities must be provided through explicit runtime adapters.",
        severity: "error"
      }
    ],

    quality_attributes: [
      {
        id: "simple",
        attribute: "simplicity",
        priority: "high",
        description: "The authoring model should remain understandable to an experienced engineer reading one file."
      },
      {
        id: "traceable",
        attribute: "traceability",
        priority: "high",
        description: "Steps, mutations, checkpoints, and verification should map clearly back to declared intent."
      },
      {
        id: "predictable",
        attribute: "predictability",
        priority: "high",
        description: "The workflow should follow normal JavaScript control flow without a hidden scheduler."
      },
      {
        id: "auditable",
        attribute: "auditability",
        priority: "high",
        description: "Runs should produce a structured result showing completed steps, verification, diagnostics, and pause or rerun state."
      },
      {
        id: "explainable",
        attribute: "explainability",
        priority: "medium",
        description: "Verification and checkpoint outcomes should be understandable to a human reviewer."
      }
    ],

    library: {
      kind: "package",
      public_api: [
        "intent(definition, runFn)",
        "must(id, text)",
        "should(id, text)",
        "outcome(id, text)",
        "verify(id, covers)"
      ],
      consumers: [
        "human-authored .axiom.js project files"
      ]
    },

    constraints: [
      must("must-be-single-file-first", "V1 centers on one user-authored .axiom.js file"),
      must("must-load-validate-and-execute", "The runtime loads a file, validates its definition, and executes its workflow callback"),
      must("must-execute-top-to-bottom", "Workflow execution follows normal JavaScript source order"),
      must("must-support-checkpoints", "The runtime supports explicit human approval, choice, and input checkpoints"),
      must("must-support-declared-verification", "Verification declarations are static and runtime checks execute by ID"),
      must("must-return-structured-run-result", "The runtime returns a structured run result with steps, verification, diagnostics, and artifacts"),
      must("must-require-explicit-adapters", "Runtime capabilities are supplied through explicit adapters"),
      must("must-require-rerun-after-intent-revision", "Intent revision applies only after the current run ends and the file is rerun"),
      should("must-remain-small-and-readable", "The MVP should avoid unnecessary framework ceremony")
    ],

    outcomes: [
      outcome("can-load-and-validate-intent-file", "Axiom loads a .axiom.js file and validates its schema"),
      outcome("can-run-steps-in-order", "Axiom executes workflow steps in normal JavaScript order"),
      outcome("can-pause-for-approval", "Axiom pauses at a checkpoint and resumes after human input"),
      outcome("can-pause-for-choice-and-input", "Axiom supports choice and input checkpoints in addition to approval"),
      outcome("can-run-verification-by-id", "Axiom executes verification logic by statically declared verification ID"),
      outcome("can-return-structured-run-result", "Axiom returns a structured run result describing steps, verification, diagnostics, and artifacts"),
      outcome("can-propose-intent-revision", "Axiom can propose an intent source edit and require rerun")
    ],

    verification: {
      intent: [
        verify("plan-covers-runtime-boundaries", [
          "must-be-single-file-first",
          "must-execute-top-to-bottom",
          "must-support-checkpoints",
          "must-support-declared-verification",
          "must-require-rerun-after-intent-revision"
        ])
      ],
      outcome: [
        verify("loads-and-validates-file", [
          "can-load-and-validate-intent-file"
        ]),
        verify("runs-steps-in-source-order", [
          "can-run-steps-in-order"
        ]),
        verify("approval-checkpoint-pauses-and-resumes", [
          "can-pause-for-approval"
        ]),
        verify("choice-and-input-checkpoints-work", [
          "can-pause-for-choice-and-input"
        ]),
        verify("verification-by-id-executes", [
          "can-run-verification-by-id"
        ]),
        verify("run-result-is-structured", [
          "can-return-structured-run-result"
        ]),
        verify("intent-revision-requires-rerun", [
          "can-propose-intent-revision"
        ])
      ]
    }
  },

  async (ctx) => {
    const brief = await ctx.step("brief", () =>
      ctx.agent("briefing").run({
        intent: ctx.intent
      })
    );

    const implementationPlan = await ctx.step("plan", () =>
      ctx.agent("planner").run({
        intent: ctx.intent,
        brief
      })
    );

    await ctx.verify.intent("plan-covers-runtime-boundaries", {
      severity: "error",
      run: async () => ({
        passed:
          implementationPlan.supportsSingleFile === true &&
          implementationPlan.supportsSourceOrderExecution === true &&
          implementationPlan.supportsCheckpoints === true &&
          implementationPlan.supportsDeclaredVerification === true &&
          implementationPlan.supportsRevisionRerunBoundary === true,
        evidence: implementationPlan
      })
    });

    await ctx.checkpoint.approval("approve-plan", {
      message: "Approve the Axiom runtime implementation plan?",
      data: implementationPlan
    });

    await ctx.step("implement", () =>
      ctx.agent("coder").run({
        intent: ctx.intent,
        plan: implementationPlan
      })
    );

    await ctx.step("test", () =>
      ctx.worker("shell").exec({
        command: "npm test",
        cwd: ctx.workspace.root()
      })
    );

    await ctx.verify.outcome("loads-and-validates-file", {
      severity: "error",
      run: async () => {
        const report = await ctx.artifact("reports/validation.json");
        return { passed: report?.passed === true, evidence: report };
      }
    });

    await ctx.verify.outcome("runs-steps-in-source-order", {
      severity: "error",
      run: async () => {
        const report = await ctx.artifact("reports/execution-order.json");
        return { passed: report?.passed === true, evidence: report };
      }
    });

    await ctx.verify.outcome("approval-checkpoint-pauses-and-resumes", {
      severity: "error",
      run: async () => {
        const report = await ctx.artifact("reports/checkpoints.json");
        return { passed: report?.approvalResumeWorked === true, evidence: report };
      }
    });

    await ctx.verify.outcome("choice-and-input-checkpoints-work", {
      severity: "error",
      run: async () => {
        const report = await ctx.artifact("reports/checkpoints.json");
        return {
          passed:
            report?.choiceWorked === true &&
            report?.inputWorked === true,
          evidence: report
        };
      }
    });

    await ctx.verify.outcome("verification-by-id-executes", {
      severity: "error",
      run: async () => {
        const report = await ctx.artifact("reports/verification.json");
        return { passed: report?.declaredIdExecutionWorked === true, evidence: report };
      }
    });

    await ctx.verify.outcome("run-result-is-structured", {
      severity: "error",
      run: async () => {
        const report = await ctx.artifact("reports/run-result.json");
        return { passed: report?.structured === true, evidence: report };
      }
    });

    await ctx.verify.outcome("intent-revision-requires-rerun", {
      severity: "error",
      run: async () => {
        const report = await ctx.artifact("reports/revision.json");
        return { passed: report?.requiresRerun === true, evidence: report };
      }
    });

    return {
      ok: true,
      app: "axiom-runtime",
      verifiedOutcomes: ctx.verification.summary()
    };
  }
);
