import { intent } from "@science451/intent-runtime";

export default intent(
  {
    id: "todo-webapp-mvp",

    meta: {
      title: "Todo List Web App",
      summary:
        "Build a simple web-based todo list application with a Go/Gin/SQLite backend and a React/Bootstrap frontend.",
      version: "1.0.0",
      owners: ["science451"],
      tags: ["webapp", "todo", "golang", "gin", "sqlite", "react", "bootstrap", "mvp"]
    },

    what: {
      capability: "todo_web_application",
      actor: "end_user",
      action: "create_manage_complete_delete_todos",
      target: "personal_todo_items",
      description:
        "Users can create, view, update, complete, and delete todo items through a web interface backed by a REST API."
    },

    why: {
      problem:
        "Users need a lightweight way to track tasks in a browser without requiring a large external service.",
      business_value:
        "Provides a simple reference application for validating the full stack intent system, including backend, frontend, persistence, and verification flows.",
      success_story:
        "A user can open the app, add a todo, mark it complete, edit it, and delete it without page errors or data loss."
    },

    scope: {
      includes: [
        "Go backend using Gin",
        "SQLite database for persistence",
        "REST API for todo CRUD operations",
        "React frontend",
        "Bootstrap styling",
        "List todos on page load",
        "Create todo from UI",
        "Edit todo title and optional description",
        "Mark todo complete/incomplete",
        "Delete todo from UI",
        "Basic validation and error handling",
        "Local development setup instructions"
      ],
      excludes: [
        "User authentication",
        "Multi-user support",
        "Sharing/collaboration",
        "Tags or categories",
        "Due dates and reminders",
        "Offline sync",
        "Drag-and-drop reordering",
        "Production cloud deployment"
      ]
    },

    stack: {
      backend: {
        language: "Go",
        framework: "Gin",
        database: "SQLite",
        api_style: "REST"
      },
      frontend: {
        framework: "React",
        styling: "Bootstrap"
      }
    },

    assumptions: [
      "This is a single-user local or small-scale app.",
      "SQLite is sufficient for persistence and does not need replication.",
      "A REST API is preferred over server-rendered HTML for clean frontend/backend separation.",
      "Bootstrap is acceptable for rapid MVP styling."
    ],

    constraints: [
      {
        id: "backend-must-use-go-gin",
        text: "The backend must be implemented in Go using Gin.",
        severity: "error"
      },
      {
        id: "database-must-use-sqlite",
        text: "The persistence layer must use SQLite.",
        severity: "error"
      },
      {
        id: "frontend-must-use-react-bootstrap",
        text: "The frontend must be implemented in React and styled with Bootstrap.",
        severity: "error"
      },
      {
        id: "must-support-crud",
        text: "The system must support create, read, update, and delete operations for todo items.",
        severity: "error"
      },
      {
        id: "must-support-completion-toggle",
        text: "Users must be able to mark todo items complete and incomplete.",
        severity: "error"
      },
      {
        id: "data-must-persist-across-restart",
        text: "Todo items must remain after the backend process restarts.",
        severity: "error"
      },
      {
        id: "must-have-basic-validation",
        text: "The app must reject empty todo titles with a clear error.",
        severity: "error"
      },
      {
        id: "must-remain-simple",
        text: "The MVP should avoid unnecessary abstractions or enterprise complexity.",
        severity: "warn"
      }
    ],

    domain_model: {
      entities: [
        {
          name: "Todo",
          description: "A single task item managed by the user.",
          fields: [
            { name: "id", type: "integer", required: true, description: "Unique identifier" },
            { name: "title", type: "string", required: true, description: "Short todo title" },
            { name: "description", type: "string", required: false, description: "Optional details" },
            { name: "completed", type: "boolean", required: true, description: "Completion state" },
            { name: "created_at", type: "datetime", required: true, description: "Creation timestamp" },
            { name: "updated_at", type: "datetime", required: true, description: "Last update timestamp" }
          ]
        }
      ]
    },

    api_contract: {
      endpoints: [
        { method: "GET", path: "/api/todos", purpose: "List all todos" },
        { method: "POST", path: "/api/todos", purpose: "Create a todo" },
        { method: "PUT", path: "/api/todos/:id", purpose: "Update a todo" },
        { method: "PATCH", path: "/api/todos/:id/toggle", purpose: "Toggle completion state" },
        { method: "DELETE", path: "/api/todos/:id", purpose: "Delete a todo" }
      ]
    },

    ui_contract: {
      screens: [
        {
          id: "todo-main-screen",
          name: "Todo Main Screen",
          description: "Displays the todo list and input controls for managing todos."
        }
      ],
      interactions: [
        "User can add a todo from the main form",
        "User can edit an existing todo",
        "User can mark a todo complete/incomplete",
        "User can delete a todo",
        "User sees validation errors for invalid input",
        "User sees an empty state when there are no todos"
      ]
    },

    outcomes: [
      { id: "todo-can-be-created", text: "A user can create a new todo from the web UI" },
      { id: "todo-list-loads", text: "The todo list loads from the backend when the page opens" },
      { id: "todo-can-be-edited", text: "A user can edit an existing todo" },
      { id: "todo-can-be-completed", text: "A user can mark a todo complete and incomplete" },
      { id: "todo-can-be-deleted", text: "A user can delete a todo" },
      { id: "todos-persist", text: "Todos remain stored after backend restart" },
      {
        id: "empty-title-rejected",
        text: "The system rejects empty todo titles with a clear user-visible message"
      }
    ],

    verification: {
      intent: [
        {
          id: "plan-covers-stack",
          covers: [
            "backend-must-use-go-gin",
            "database-must-use-sqlite",
            "frontend-must-use-react-bootstrap"
          ],
          description:
            "The implementation plan explicitly includes the required backend, database, and frontend technologies."
        },
        {
          id: "plan-covers-crud-and-toggle",
          covers: ["must-support-crud", "must-support-completion-toggle"],
          description:
            "The plan includes all CRUD operations plus completion toggle behavior."
        },
        {
          id: "plan-covers-validation-and-persistence",
          covers: [
            "data-must-persist-across-restart",
            "must-have-basic-validation"
          ],
          description:
            "The plan includes persistence across restart and input validation."
        }
      ],

      outcome: [
        {
          id: "backend-api-contract-test",
          covers: ["must-support-crud", "must-support-completion-toggle"],
          description:
            "API tests verify list/create/update/toggle/delete behavior."
        },
        {
          id: "sqlite-persistence-test",
          covers: ["data-must-persist-across-restart"],
          description:
            "Persistence test verifies data survives backend restart."
        },
        {
          id: "frontend-e2e-todo-flow",
          covers: [
            "todo-can-be-created",
            "todo-list-loads",
            "todo-can-be-edited",
            "todo-can-be-completed",
            "todo-can-be-deleted"
          ],
          description:
            "End-to-end browser test verifies the core todo UI workflow."
        },
        {
          id: "empty-title-validation-test",
          covers: ["must-have-basic-validation", "empty-title-rejected"],
          description:
            "Validation test verifies empty titles are rejected clearly."
        }
      ]
    },

    docs: {
      overview:
        "This application is intended to be a clean MVP reference for a modern split frontend/backend web app using a lightweight Go backend and a React UI.",
      notes: [
        "Keep the code straightforward and easy to read.",
        "Favor small, obvious files over excessive abstraction.",
        "The API and UI should be understandable to a junior engineer."
      ],
      tradeoffs: [
        "SQLite is chosen for simplicity over horizontal scalability.",
        "Bootstrap is chosen for speed of implementation over highly customized design.",
        "A single-page React UI is chosen for separation of concerns and future extensibility."
      ]
    }
  },
  async (ctx) => {
    const brief = await ctx.step("brief", async () => {
      return await ctx.agent("briefing").run({
        title: ctx.intent.meta.title,
        summary: ctx.intent.meta.summary,
        what: ctx.intent.what.description,
        why: ctx.intent.why.problem,
        scope: ctx.intent.scope,
        constraints: ctx.intent.constraints,
        stack: ctx.intent.stack
      });
    });

    const plan = await ctx.step("plan", async () => {
      return await ctx.agent("planner").run({
        brief,
        architecture: {
          backend: "Go + Gin + SQLite REST API",
          frontend: "React + Bootstrap SPA"
        },
        domain_model: ctx.intent.domain_model,
        api_contract: ctx.intent.api_contract,
        ui_contract: ctx.intent.ui_contract
      });
    });

    await ctx.verify.intent("plan-covers-stack", {
      severity: "error",
      run: async () => {
        return {
          passed:
            plan.usesGo === true &&
            plan.usesGin === true &&
            plan.usesSQLite === true &&
            plan.usesReact === true &&
            plan.usesBootstrap === true,
          evidence: {
            usesGo: plan.usesGo,
            usesGin: plan.usesGin,
            usesSQLite: plan.usesSQLite,
            usesReact: plan.usesReact,
            usesBootstrap: plan.usesBootstrap
          }
        };
      }
    });

    await ctx.verify.intent("plan-covers-crud-and-toggle", {
      severity: "error",
      run: async () => {
        return {
          passed:
            plan.includesListTodos === true &&
            plan.includesCreateTodo === true &&
            plan.includesUpdateTodo === true &&
            plan.includesDeleteTodo === true &&
            plan.includesToggleTodo === true,
          evidence: {
            list: plan.includesListTodos,
            create: plan.includesCreateTodo,
            update: plan.includesUpdateTodo,
            delete: plan.includesDeleteTodo,
            toggle: plan.includesToggleTodo
          }
        };
      }
    });

    await ctx.verify.intent("plan-covers-validation-and-persistence", {
      severity: "error",
      run: async () => {
        return {
          passed:
            plan.includesSQLitePersistence === true &&
            plan.includesRestartPersistenceCheck === true &&
            plan.includesEmptyTitleValidation === true,
          evidence: {
            sqlitePersistence: plan.includesSQLitePersistence,
            restartPersistenceCheck: plan.includesRestartPersistenceCheck,
            emptyTitleValidation: plan.includesEmptyTitleValidation
          }
        };
      }
    });

    await ctx.checkpoint.approval("approve-plan", {
      message: "Approve this implementation plan?",
      data: plan
    });

    const implementation = await ctx.step("implement", async () => {
      return await ctx.agent("coder").run({
        plan,
        deliverables: [
          "Go backend source",
          "Gin routes and handlers",
          "SQLite schema and repository layer",
          "React frontend source",
          "Bootstrap-based UI",
          "README/dev run instructions"
        ]
      });
    });

    const unitTests = await ctx.step("unit-test", async () => {
      return await ctx.worker("shell").exec({
        command: "make test-unit",
        cwd: ctx.workspace.root()
      });
    });

    const integrationTests = await ctx.step("integration-test", async () => {
      return await ctx.worker("shell").exec({
        command: "make test-integration",
        cwd: ctx.workspace.root()
      });
    });

    const e2eTests = await ctx.step("e2e-test", async () => {
      return await ctx.worker("shell").exec({
        command: "make test-e2e",
        cwd: ctx.workspace.root()
      });
    });

    await ctx.verify.outcome("backend-api-contract-test", {
      severity: "error",
      run: async () => {
        const report = await ctx.artifact("reports/api-contract.json");
        return {
          passed: report?.passed === true,
          evidence: report
        };
      }
    });

    await ctx.verify.outcome("sqlite-persistence-test", {
      severity: "error",
      run: async () => {
        const report = await ctx.artifact("reports/persistence.json");
        return {
          passed: report?.passed === true,
          evidence: report
        };
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

    await ctx.checkpoint("final-summary", {
      brief,
      plan,
      implementation,
      unitTests,
      integrationTests,
      e2eTests
    });

    return {
      ok: true,
      app: "todo-webapp",
      stack: ctx.intent.stack,
      verifiedOutcomes: ctx.verification.summary()
    };
  }
);
