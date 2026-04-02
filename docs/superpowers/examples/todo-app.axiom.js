import {
  intent,
  must,
  should,
  outcome,
  verify
} from "@science451/intent-runtime";

export default intent(
  {
    id: "todo-webapp-mvp",

    meta: {
      title: "Todo List Web App",
      summary: "Simple full-stack todo app with Go/Gin/SQLite and React/Bootstrap.",
      version: "1.0.0",
      tags: ["todo", "webapp", "go", "gin", "sqlite", "react", "bootstrap", "mvp"]
    },

    what: {
      capability: "todo_web_application",
      description: "Users can create, edit, complete, and delete todos in a web UI."
    },

    why: {
      problem: "Users need a lightweight browser-based task tracker.",
      value: "Provides a small verifiable reference app for the intent runtime."
    },

    scope: {
      includes: [
        "Go + Gin backend",
        "SQLite persistence",
        "React + Bootstrap frontend",
        "CRUD API",
        "completion toggle",
        "basic validation",
        "explicit human plan approval",
        "artifact-backed verification reports"
      ],
      excludes: [
        "authentication",
        "multi-user support",
        "due dates",
        "cloud deployment",
        "custom debugger support",
        "hidden implicit adapters"
      ]
    },

    runtime: {
      languages: ["go", "javascript"],
      targets: ["native", "browser"],
      platforms: ["linux", "macos", "windows", "web"]
    },

    build: {
      system: "make",
      test_runner: "make"
    },

    assumptions: [
      "The app is single-user and local-first for MVP purposes.",
      "A writable project workspace is available during generation and testing.",
      "The human user will review the implementation plan before code generation proceeds.",
      "The runtime environment provides explicit AI, shell, workspace, and artifact capabilities.",
      "The generated app can emit machine-readable test reports under a managed reports directory."
    ],

    architecture: {
      components: [
        {
          id: "backend-api",
          responsibility: "Serve REST endpoints for todo CRUD operations and persistence."
        },
        {
          id: "sqlite-store",
          responsibility: "Persist todo data across backend restarts.",
          depends_on: ["backend-api"]
        },
        {
          id: "frontend-ui",
          responsibility: "Render the todo interface and drive user interactions against the API.",
          depends_on: ["backend-api"]
        },
        {
          id: "workspace-and-reports",
          responsibility: "Manage generated files, test reports, and other verification artifacts."
        }
      ]
    },

    policies: [
      {
        id: "plan-must-be-approved",
        rule: "Implementation must not begin until the human approves the generated plan.",
        severity: "error"
      },
      {
        id: "verification-must-be-declared",
        rule: "Runtime verification must reference statically declared verification IDs.",
        severity: "error"
      },
      {
        id: "intent-should-flow-through-ctx-intent",
        rule: "Steps should use ctx.intent as the validated high-level intent object by default.",
        severity: "warn"
      },
      {
        id: "workspace-mutation-must-be-managed",
        rule: "Generated file changes must happen through runtime-managed tools and workspace APIs.",
        severity: "error"
      },
      {
        id: "runtime-capabilities-must-be-explicit",
        rule: "AI, shell, workspace, and artifact capabilities must be provided explicitly by the runtime.",
        severity: "error"
      }
    ],

    quality_attributes: [
      {
        id: "traceable",
        attribute: "traceability",
        priority: "high",
        description: "Generated artifacts and verification results should map clearly back to declared intent."
      },
      {
        id: "simple",
        attribute: "simplicity",
        priority: "high",
        description: "The app should remain small, understandable, and low-abstraction."
      },
      {
        id: "predictable",
        attribute: "predictability",
        priority: "medium",
        description: "The runtime flow and produced implementation should follow the approved plan clearly."
      },
      {
        id: "auditable",
        attribute: "auditability",
        priority: "medium",
        description: "The app generation flow should produce reports and outputs that are easy to review."
      },
      {
        id: "explainable",
        attribute: "explainability",
        priority: "medium",
        description: "Verification failures should be understandable from the produced reports."
      }
    ],

    web: {
      kind: "full-stack",
      frontend: {
        framework: "react",
        styling: "bootstrap"
      },
      api: {
        style: "rest",
        endpoints: [
          { method: "GET", path: "/api/todos" },
          { method: "POST", path: "/api/todos" },
          { method: "PUT", path: "/api/todos/:id" },
          { method: "PATCH", path: "/api/todos/:id/toggle" },
          { method: "DELETE", path: "/api/todos/:id" }
        ]
      },
      interactions: [
        "list todos on load",
        "create todo",
        "edit todo",
        "toggle todo",
        "delete todo",
        "show validation errors",
        "show empty state"
      ]
    },

    constraints: [
      must("backend-must-use-go-gin", "Backend uses Go and Gin"),
      must("database-must-use-sqlite", "Persistence uses SQLite"),
      must("frontend-must-use-react-bootstrap", "Frontend uses React and Bootstrap"),
      must("must-support-crud", "App supports create, read, update, delete"),
      must("must-support-completion-toggle", "App supports complete/incomplete toggle"),
      must("data-must-persist-across-restart", "Todos persist across backend restart"),
      must("must-have-basic-validation", "Empty todo titles are rejected"),
      must("must-use-explicit-runtime-capabilities", "Runtime capabilities are supplied through explicit adapters"),
      should("must-remain-simple", "Keep the MVP straightforward and low-abstraction")
    ],

    model: {
      entities: [
        {
          name: "Todo",
          fields: {
            id: "integer",
            title: "string",
            description: "string?",
            completed: "boolean",
            created_at: "datetime",
            updated_at: "datetime"
          }
        }
      ]
    },

    outcomes: [
      outcome("todo-can-be-created", "User can create a todo from the UI"),
      outcome("todo-list-loads", "Todo list loads when the page opens"),
      outcome("todo-can-be-edited", "User can edit an existing todo"),
      outcome("todo-can-be-completed", "User can mark a todo complete/incomplete"),
      outcome("todo-can-be-deleted", "User can delete a todo"),
      outcome("todos-persist", "Todos remain after backend restart"),
      outcome("empty-title-rejected", "Empty titles are rejected with a clear message"),
      outcome("reports-are-produced", "Tests and verification steps produce machine-readable reports")
    ],

    verification: {
      intent: [
        verify("plan-covers-stack", [
          "backend-must-use-go-gin",
          "database-must-use-sqlite",
          "frontend-must-use-react-bootstrap"
        ]),
        verify("plan-covers-crud-and-toggle", [
          "must-support-crud",
          "must-support-completion-toggle"
        ]),
        verify("plan-covers-validation-and-persistence", [
          "data-must-persist-across-restart",
          "must-have-basic-validation"
        ])
      ],
      outcome: [
        verify("backend-api-contract-test", [
          "must-support-crud",
          "must-support-completion-toggle"
        ]),
        verify("sqlite-persistence-test", [
          "data-must-persist-across-restart"
        ]),
        verify("frontend-e2e-todo-flow", [
          "todo-can-be-created",
          "todo-list-loads",
          "todo-can-be-edited",
          "todo-can-be-completed",
          "todo-can-be-deleted"
        ]),
        verify("empty-title-validation-test", [
          "must-have-basic-validation",
          "empty-title-rejected"
        ]),
        verify("verification-reports-exist", [
          "reports-are-produced"
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

    const plan = await ctx.step("plan", () =>
      ctx.agent("planner").run({
        brief,
        intent: ctx.intent
      })
    );

    await ctx.verify.intent("plan-covers-stack", {
      severity: "error",
      run: async () => ({
        passed:
          plan.usesGo === true &&
          plan.usesGin === true &&
          plan.usesSQLite === true &&
          plan.usesReact === true &&
          plan.usesBootstrap === true,
        evidence: plan
      })
    });

    await ctx.verify.intent("plan-covers-crud-and-toggle", {
      severity: "error",
      run: async () => ({
        passed:
          plan.includesListTodos === true &&
          plan.includesCreateTodo === true &&
          plan.includesUpdateTodo === true &&
          plan.includesDeleteTodo === true &&
          plan.includesToggleTodo === true,
        evidence: plan
      })
    });

    await ctx.verify.intent("plan-covers-validation-and-persistence", {
      severity: "error",
      run: async () => ({
        passed:
          plan.includesSQLitePersistence === true &&
          plan.includesRestartPersistenceCheck === true &&
          plan.includesEmptyTitleValidation === true,
        evidence: plan
      })
    });

    await ctx.checkpoint.approval("approve-plan", {
      message: "Approve this implementation plan?",
      data: plan
    });

    const implementation = await ctx.step("implement", () =>
      ctx.agent("coder").run({
        plan,
        deliverables: ["backend", "frontend", "tests", "readme"]
      })
    );

    await ctx.step("unit-test", () =>
      ctx.worker("shell").exec({
        command: "make test-unit",
        cwd: ctx.workspace.root()
      })
    );

    await ctx.step("integration-test", () =>
      ctx.worker("shell").exec({
        command: "make test-integration",
        cwd: ctx.workspace.root()
      })
    );

    await ctx.step("e2e-test", () =>
      ctx.worker("shell").exec({
        command: "make test-e2e",
        cwd: ctx.workspace.root()
      })
    );

    await ctx.verify.outcome("backend-api-contract-test", {
      severity: "error",
      run: async () => {
        const report = await ctx.artifact("reports/api-contract.json");
        return { passed: report?.passed === true, evidence: report };
      }
    });

    await ctx.verify.outcome("sqlite-persistence-test", {
      severity: "error",
      run: async () => {
        const report = await ctx.artifact("reports/persistence.json");
        return { passed: report?.passed === true, evidence: report };
      }
    });

    await ctx.verify.outcome("frontend-e2e-todo-flow", {
      severity: "error",
      run: async () => {
        const report = await ctx.artifact("reports/e2e.json");
        return {
          passed:
            report?.flows?.createTodo === true &&
            report?.flows?.loadTodos === true &&
            report?.flows?.editTodo === true &&
            report?.flows?.toggleTodo === true &&
            report?.flows?.deleteTodo === true,
          evidence: report
        };
      }
    });

    await ctx.verify.outcome("empty-title-validation-test", {
      severity: "error",
      run: async () => {
        const report = await ctx.artifact("reports/validation.json");
        return {
          passed: report?.emptyTitleRejected === true,
          evidence: report
        };
      }
    });

    await ctx.verify.outcome("verification-reports-exist", {
      severity: "error",
      run: async () => {
        const unit = await ctx.artifact("reports/unit.json");
        const ui = await ctx.artifact("reports/e2e.json");
        return {
          passed: Boolean(unit) && Boolean(ui),
          evidence: { unit, ui }
        };
      }
    });

    return {
      ok: true,
      app: "todo-webapp",
      implementation,
      verifiedOutcomes: ctx.verification.summary()
    };
  }
);
