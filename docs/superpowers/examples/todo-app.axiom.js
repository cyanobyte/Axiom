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
        "basic validation"
      ],
      excludes: [
        "authentication",
        "multi-user support",
        "due dates",
        "cloud deployment"
      ]
    },

    stack: {
      backend: { language: "Go", framework: "Gin", database: "SQLite" },
      frontend: { framework: "React", styling: "Bootstrap" }
    },

    constraints: [
      must("backend-must-use-go-gin", "Backend uses Go and Gin"),
      must("database-must-use-sqlite", "Persistence uses SQLite"),
      must("frontend-must-use-react-bootstrap", "Frontend uses React and Bootstrap"),
      must("must-support-crud", "App supports create, read, update, delete"),
      must("must-support-completion-toggle", "App supports complete/incomplete toggle"),
      must("data-must-persist-across-restart", "Todos persist across backend restart"),
      must("must-have-basic-validation", "Empty todo titles are rejected"),
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

    api: {
      endpoints: [
        { method: "GET", path: "/api/todos" },
        { method: "POST", path: "/api/todos" },
        { method: "PUT", path: "/api/todos/:id" },
        { method: "PATCH", path: "/api/todos/:id/toggle" },
        { method: "DELETE", path: "/api/todos/:id" }
      ]
    },

    ui: {
      screens: ["todo-main"],
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

    outcomes: [
      outcome("todo-can-be-created", "User can create a todo from the UI"),
      outcome("todo-list-loads", "Todo list loads when the page opens"),
      outcome("todo-can-be-edited", "User can edit an existing todo"),
      outcome("todo-can-be-completed", "User can mark a todo complete/incomplete"),
      outcome("todo-can-be-deleted", "User can delete a todo"),
      outcome("todos-persist", "Todos remain after backend restart"),
      outcome("empty-title-rejected", "Empty titles are rejected with a clear message")
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
        ])
      ]
    }
  },

  async (ctx) => {
    const brief = await ctx.step("brief", () =>
      ctx.agent("briefing").run({
        meta: ctx.intent.meta,
        what: ctx.intent.what,
        why: ctx.intent.why,
        scope: ctx.intent.scope,
        stack: ctx.intent.stack,
        constraints: ctx.intent.constraints
      })
    );

    const plan = await ctx.step("plan", () =>
      ctx.agent("planner").run({
        brief,
        model: ctx.intent.model,
        api: ctx.intent.api,
        ui: ctx.intent.ui
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

    return {
      ok: true,
      app: "todo-webapp",
      implementation,
      verifiedOutcomes: ctx.verification.summary()
    };
  }
);
