import { intent, run, createDevAdapters } from "@axiom/core";

const todoApp = intent("todo-app", (d) => {
  d.meta({
    title: "Simple Todo App",
    summary: "A React frontend with an Express backend for basic todo management."
  });

  d.what("Users can create, view, complete, and delete todo items in a web UI.");
  d.why("Provide a small reference app that demonstrates end-to-end intent, generation, and verification.");

  d.includes("Node.js backend");
  d.includes("Express API");
  d.includes("React frontend");
  d.includes("Todo list UI");
  d.includes("Create todo");
  d.includes("Toggle complete state");
  d.includes("Delete todo");
  d.includes("Basic validation");

  d.excludes("Authentication");
  d.excludes("Multi-user support");
  d.excludes("Due dates");
  d.excludes("Cloud deployment");

  d.constraint("backend-stack", "The backend must use Node.js and Express.");
  d.constraint("frontend-stack", "The frontend must use React.");
  d.constraint("no-empty-titles", "Todo titles must not be empty.");
  d.constraint("must-support-create", "The app must support creating todos.");
  d.constraint("must-support-toggle", "The app must support marking todos complete and incomplete.");
  d.constraint("must-support-delete", "The app must support deleting todos.");

  d.outcome("create-todo", "A user can create a todo from the UI.");
  d.outcome("toggle-todo", "A user can mark a todo complete and incomplete.");
  d.outcome("delete-todo", "A user can delete a todo from the UI.");
  d.outcome("validation-visible", "Empty titles are rejected with a visible error.");
  d.outcome("list-visible", "Existing todos are visible in the UI.");

  d.stage("plan", {
    description: "Produce an implementation plan for the application.",
    run: async (ctx) => {
      return {
        output: await ctx.llm("planner").generate({
          system: "Produce a concrete implementation plan for a small React and Express todo app.",
          input: {
            meta: ctx.meta,
            intent: ctx.intent
          }
        })
      };
    }
  });

  d.checkpoint.approval("approve-plan", {
    description: "Human reviews the generated plan before implementation.",
    message: "Approve this implementation plan?",
    data: (ctx) => ctx.stageResult("plan")
  });

  d.stage("implement-backend", {
    description: "Create the Express backend for todo CRUD behavior.",
    run: async (ctx) => {
      const approval = ctx.checkpointResult("approve-plan");

      if (!approval?.accepted) {
        throw new Error("Plan was not approved.");
      }

      return {
        output: await ctx.llm("coder").generate({
          system: "Write the backend for the approved plan.",
          input: {
            plan: ctx.stageResult("plan")
          }
        }),
        diagnostics: [
          { level: "info", message: "Backend implementation requested from coder." }
        ]
      };
    }
  });

  d.stage("implement-frontend", {
    description: "Create the React UI for todo interactions.",
    run: async (ctx) => {
      return {
        output: await ctx.llm("coder").generate({
          system: "Write the frontend for the approved plan.",
          input: {
            plan: ctx.stageResult("plan")
          }
        })
      };
    }
  });

  d.stage("test", {
    description: "Run the app test suite and collect reports.",
    run: async (ctx) => {
      await ctx.exec("npm test", { cwd: ctx.workspace.root() });

      return {
        artifacts: [
          { path: "reports/unit.json", kind: "test-report" },
          { path: "reports/ui.json", kind: "test-report" }
        ]
      };
    }
  });

  d.verify.intent("plan-covers-stack", {
    clauses: ["backend-stack", "frontend-stack"],
    check: async (ctx) => {
      const plan = ctx.stageResult("plan");

      return {
        passed:
          plan?.backend?.runtime === "Node.js" &&
          plan?.backend?.framework === "Express" &&
          plan?.frontend?.framework === "React",
        evidence: {
          backend: plan?.backend,
          frontend: plan?.frontend
        }
      };
    }
  });

  d.verify.intent("plan-covers-core-behavior", {
    clauses: [
      "must-support-create",
      "must-support-toggle",
      "must-support-delete",
      "no-empty-titles"
    ],
    check: async (ctx) => {
      const plan = ctx.stageResult("plan");
      const features = plan?.features ?? [];

      return {
        passed:
          features.includes("create") &&
          features.includes("toggle") &&
          features.includes("delete") &&
          features.includes("empty-title-validation"),
        evidence: { features }
      };
    }
  });

  d.verify.outcome("ui-basic-flow", {
    clauses: ["create-todo", "toggle-todo", "delete-todo", "list-visible"],
    check: async (ctx) => {
      const report = await ctx.artifact("reports/ui.json");

      return {
        passed:
          report?.createTodo === true &&
          report?.toggleTodo === true &&
          report?.deleteTodo === true &&
          report?.listVisible === true,
        evidence: report
      };
    }
  });

  d.verify.outcome("empty-title-rejected", {
    clauses: ["no-empty-titles", "validation-visible"],
    check: async (ctx) => {
      const report = await ctx.artifact("reports/unit.json");

      return {
        passed: report?.emptyTitleRejected === true,
        evidence: report
      };
    }
  });
});

const adapters = createDevAdapters({
  cwd: process.cwd()
});

await run(todoApp, adapters);
