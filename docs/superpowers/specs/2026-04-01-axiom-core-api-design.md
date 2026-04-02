# Axiom Core API Design

Date: 2026-04-01
Status: Draft approved for planning

## Overview

Axiom is a development system where engineers define intent as executable code, and LLMs generate implementations and plans that are continuously verified against that intent. Intent includes what a system must do, why it exists, its constraints, and its success criteria.

The canonical concrete example for this spec is [`docs/superpowers/examples/todo-app.axiom.js`](/mnt/d/Science451/Axiom/docs/superpowers/examples/todo-app.axiom.js). Changes to the public API or runtime model should be reflected in that file so the example remains valid to the project.

V1 focuses on the core JavaScript authoring API. Engineers should be able to write intent in a way that feels like writing a spec, not a framework. The surface should feel like JavaScript, not a DSL; it should feel like declaring truth, not wiring plumbing; and it should feel like tests and requirements merged into one. The API must stay predictable, minimal, and easy to reason about.

The authoring model is declarative modules with a small authored vocabulary, not giant nested objects. Authors should write concise, intentional declarations with small executable hooks where proof requires real logic. Internally, Axiom may normalize authored modules into a richer model, but the surface should remain readable source code with clear boundaries and names.

## Goals

- Provide a small JavaScript API for authoring executable intent.
- Normalize authored modules into a stable internal intent model.
- Preserve traceability from authored clauses to verification and diagnostics.
- Define the foundational contracts that later verification and diagnostics systems will consume.
- Make intent-aware debugging first-class through structured metadata and source mapping.

## Non-Goals

- Building the full orchestration layer for LLM planning and implementation.
- Building a custom live debugger.
- Solving every possible target system or runtime in V1.
- Designing a giant schema-driven configuration format.

## Core Components

V1 should have four core pieces.

### Authoring API

A small JavaScript API for declaring systems, requirements, constraints, success criteria, and verification hooks. This is the only surface engineers write directly.

### Intent Model

An immutable definition model built from authored modules. This gives the rest of the system a stable structure without forcing authors to write raw data shapes, while preserving the distinction between definition-building and execution.

### Verification Runtime

A runtime that evaluates whether an implementation satisfies the declared intent. It executes explicit checks, tracks clause-to-check coverage, and attaches evidence to results, so correctness is based on concrete proof rather than inferred confidence.

### Diagnostics Layer

An explanation and reporting layer that shows what passed, what failed, which intent clause each result maps to, what evidence was collected, and where proof is missing. If Axiom is going to govern LLM-produced code, outcomes must be explainable and traceable.

For V1, the core API repo should primarily establish the authoring API, definition model, and minimal execution contracts cleanly, while defining the interfaces the verification runtime and diagnostics layer will depend on. That keeps scope controlled without designing the API in a vacuum.

## Authoring Model

V1 centers on JavaScript modules that read like executable specifications. Engineers write intent as normal code using an explicit builder object passed into `intent(name, defineFn)`. The module should be mostly declarations, with selective executable hooks where proof requires real logic. The shape is spec first: concise named declarations for what the system is, why it exists, its constraints, success criteria, stages, and verification rules.

To avoid collapsing into a giant object, the API should prefer small composable builder calls over one monolithic literal. The authoring experience should encourage a sequence of intentional statements rather than a single deeply nested export. Internally Axiom can finalize this into an immutable definition model, but the surface API should feel like authored source code with readable boundaries and names.

Authors declare truths, not lifecycle wiring. If a verification rule needs code, it should appear as a focused executable clause attached to a clear requirement, not as framework plumbing spread across files.

## Data Flow

The V1 flow should be:

1. Engineers author intent in JavaScript modules using `intent(name, defineFn)`.
2. Axiom builds and freezes an immutable `IntentDefinition`.
3. Engineers call `run(definition, adapters, options?)` to start execution explicitly.
4. The runtime executes stages in declared order, records stage outputs and mutations, and runs eligible verification checks incrementally.
5. The final verification pass evaluates produced artifacts and outcomes against the declared clauses, stores concrete evidence, and produces structured diagnostics.

Two design constraints matter here. First, traceability must be first-class, not reconstructed later from test names or logs. Second, execution and verification results must be structured data, not just console output, because LLM orchestration and tooling will need to consume them programmatically.

## Error Handling

V1 should fail in ways that preserve trust in the intent model.

Authoring errors should be caught early and reported against the authored source with clear clause context. If intent is malformed, ambiguous, or incomplete enough that Axiom cannot build a reliable Intent Model, normalization should fail explicitly rather than guessing.

Verification outcomes should be classified into distinct categories: clause failed, clause uncovered, check execution error, and evidence missing or insufficient. These represent different states with different implications, and collapsing them into a generic failure would make the system hard to reason about.

Axiom should distinguish between proof failures and system failures. Proof failures indicate that the system's behavior does not satisfy the declared intent. System failures indicate that Axiom was unable to determine correctness due to execution errors, missing artifacts, or runtime issues.

Traceability gaps should be treated as first-class errors. If a declared clause has no mapped verification, or a verification result cannot be tied back to a stable clause identity, that is not just missing metadata; it is a proof defect.

Verification results should carry structured status and severity, allowing errors, warnings, and informational conditions to be handled differently while preserving a consistent model of clause state.

## Testing

V1 testing should focus on the correctness of the authoring surface and the integrity of normalization and traceability.

The authoring API should be tested for readability-preserving structure as well as behavior: declarations should normalize consistently, clause identities should remain stable across formatting and ordering changes, and small authored modules should produce predictable intent graphs. Since the API is supposed to feel like writing a spec, tests should favor realistic authored examples over low-level unit cases in isolation.

Normalization tests should verify that equivalent authored intent produces the same internal model, malformed intent fails with precise diagnostics, and clause relationships and identities are preserved through loading. Authoring order should not affect the resulting model unless explicitly defined.

Verification-facing tests, at this stage, should focus on contracts rather than a full proof engine: the model must expose enough structure for checks, coverage mapping, evidence attachment, and diagnostics to operate deterministically.

Traceability tests should ensure that every clause has a stable identity, every verification check maps to one or more clauses, and every clause can be resolved to its associated checks, evidence, and status.

A small set of end-to-end fixture specs should anchor the whole design. Those fixtures should prove that an authored module can be loaded, normalized, traced, and reported on in a way that matches the authored intent exactly. Fixtures should remain small, readable, and representative, serving as both regression tests and canonical examples.

## Intent-Aware Debugging

Axiom V1 should make intent-aware debugging first-class through stable clause identities, source mapping, verification events, and structured diagnostics, while relying on standard Node.js tooling for raw code execution debugging.

Engineers should be able to use normal JavaScript debugging tools for execution-level issues, while Axiom provides the missing layer: mapping runtime and verification outcomes back to intent clauses, authored source locations, coverage state, and evidence.

This implies the V1 model should define these artifacts early, even if the first interface is only CLI or JSON output:

- `ClauseId`
- `SourceLocation`
- `VerificationEvent`
- `EvidenceRecord`
- `ClauseStatus`
- `CoverageMapping`
- `Diagnostic`

These types should be stable, machine-readable, and suitable for later editor integration, including a strong VS Code experience, without requiring V1 to ship a bespoke debugger.

## Implementation Architecture

### Public API

V1 should expose a small public API centered on one top-level definition entry point:

- `intent(definition, runFn)`

`intent(definition, runFn)` combines a declarative intent object with an executable runtime callback. The definition object is static and inspectable. The runtime callback is where workflow execution happens through `ctx.step(...)`, `ctx.verify.*(...)`, `ctx.checkpoint...(...)`, and agent or tool calls.

The runtime still requires explicit adapters, but those should be supplied when the intent file is executed by the runtime rather than by a separate `run(definition, adapters)` export hidden inside the authored file.

Conceptually, the public API is:

```ts
type IntentDefinition = Readonly<{
  kind: "intent-definition";
  id: string;
  meta: Meta;
  what: WhatDefinition;
  why: WhyDefinition;
  scope: ScopeDefinition;
  stack?: StackDefinition;
  assumptions?: string[];
  constraints: ConstraintDefinition[];
  outcomes: OutcomeDefinition[];
  domain_model?: DomainModelDefinition;
  api_contract?: ApiContractDefinition;
  ui_contract?: UiContractDefinition;
  verification: {
    intent: VerificationDeclaration[];
    outcome: VerificationDeclaration[];
  };
  docs?: DocsDefinition;
}>;
```

### Definition Model

The definition phase should produce a static, immutable, source-attributed `IntentDefinition`.

It should include:

- `meta`
- `what`
- `why`
- `scope`
- `stack`
- `assumptions`
- `constraints`
- `outcomes`
- `domain_model`
- `api_contract`
- `ui_contract`
- `verification.intent`
- `verification.outcome`
- `docs`

Constraints and outcomes remain separate first-class clause sets. Verification declarations stay split into `verification.intent` and `verification.outcome`, preserving the distinction between proving alignment with intent and proving the resulting system satisfies declared outcomes.

Verification identity and coverage should be declarative in the definition. Runtime proof execution should reference those declared IDs rather than inventing ad hoc checks with no static declaration.

Conceptually, the core definition records are:

```ts
type Meta = {
  title?: string;
  summary?: string;
};

type ClauseId = string;
type StepId = string;
type VerificationId = string;

type WhatDefinition = {
  capability: string;
  actor: string;
  action: string;
  target: string;
  description: string;
};

type WhyDefinition = {
  problem: string;
  business_value?: string;
  success_story?: string;
};

type ScopeDefinition = {
  includes: string[];
  excludes: string[];
};

type ConstraintDefinition = {
  id: ClauseId;
  text: string;
  severity?: "error" | "warn" | "info";
  source?: SourceLocation;
};

type OutcomeDefinition = {
  id: ClauseId;
  text: string;
  source?: SourceLocation;
};

type VerificationDeclaration = {
  id: VerificationId;
  covers: ClauseId[];
  description?: string;
  source?: SourceLocation;
};

type SourceLocation = {
  file?: string;
  line?: number;
  column?: number;
};
```

### Runtime Architecture

Execution begins when the authored intent file is run and the runtime invokes the `runFn` with a live `ctx`.

Running a definition should:

1. Create a `RunSession`
2. Execute `ctx.step(...)` calls in source order as they are encountered
3. Normalize each step result into a standard result envelope
4. Record mutations, artifacts, diagnostics, and step output
5. Run verification checks when `ctx.verify.intent(...)` or `ctx.verify.outcome(...)` is invoked
6. Support checkpoints and pauses through `ctx.checkpoint...(...)`
7. Return a structured `RunResult`

V1 should prefer readability and predictability over graph scheduling. Source order is the execution order unless the runtime later gains an explicit extension for alternate control flow.

### Stage Results

Axiom should use a structured step result envelope with a flexible `output` field.

For V1:

- the runtime requires an internal normalized envelope
- authors may return shorthand values for ergonomics
- the explicit author-facing envelope stays minimal:
  - `output`
  - `artifacts`
  - `diagnostics`

So a step may return an arbitrary JavaScript value, and Axiom will normalize it to the standard structure. This keeps step-to-step data passing predictable without forcing ceremony on authors.

Conceptually:

```ts
type StageAuthorResult =
  | unknown
  | {
      output?: unknown;
      artifacts?: ArtifactRecord[];
      diagnostics?: Diagnostic[];
    };

type StepResult = {
  stepId: StepId;
  status: "passed" | "failed" | "error";
  startedAt: string;
  finishedAt: string;
  output: unknown;
  artifacts: ArtifactRecord[];
  diagnostics: Diagnostic[];
  mutations: MutationRecord[];
};
```

### Execution Context and Adapters

The live execution API is `ctx`, and `ctx` should be a facade over session state and explicit adapters rather than the owner of those implementations.

The runtime must use explicit adapters. `@science451/intent-runtime` may ship simple dev/test adapters and factories, but runtime behavior must remain explicit and injected.

Conceptually:

```ts
type StageContext = {
  meta: Meta;
  intent: IntentDefinition;
  step<T = unknown>(stepId: StepId, run: () => Promise<T> | T): Promise<T>;
  stepResult<T = unknown>(stepId: StepId): T | undefined;
  workspace: {
    root(): string;
    read(path: string): Promise<string>;
    write(path: string, content: string): Promise<void>;
    patch(path: string, diff: string): Promise<void>;
    list(path?: string): Promise<string[]>;
  };
  artifact(path: string): Promise<unknown>;
  agent(name: string): AgentSession;
  worker(name: string): WorkerSession;
  verify: {
    intent(
      verificationId: VerificationId,
      spec: RuntimeVerificationSpec
    ): Promise<VerificationRecord>;
    outcome(
      verificationId: VerificationId,
      spec: RuntimeVerificationSpec
    ): Promise<VerificationRecord>;
  };
  checkpoint: CheckpointApi;
};
```

### Workspace Control and Traceability

A step should not perform arbitrary direct file mutation, but it should be allowed to mutate files through explicit runtime-managed workspace APIs or injected tools. This ensures all changes remain traceable, observable, and attributable.

That means:

- direct uncontrolled file writes are outside the step contract
- file changes must flow through Axiom-managed workspace operations or injected tools
- the runtime should record what changed, which step caused it, and what evidence followed

### Verification Lifecycle

V1 should support verification as an explicit runtime action through `ctx.verify.intent(...)` and `ctx.verify.outcome(...)`, with the option for the runtime to schedule additional finalization or summary passes at completion.

Verification identity and coverage come from the static definition. The runtime call supplies the actual proof logic, evidence gathering, and execution timing.

Verification status is still first-class. A verification check may move through states such as:

- `pending`
- `eligible`
- `passed`
- `failed`
- `error`
- `missing-evidence`

Conceptually:

```ts
type VerificationCheckResult = {
  passed: boolean;
  evidence?: unknown;
  diagnostics?: Diagnostic[];
};

type VerificationStatus =
  | "pending"
  | "eligible"
  | "passed"
  | "failed"
  | "error"
  | "missing-evidence";

type VerificationRecord = {
  verificationId: VerificationId;
  kind: "intent" | "outcome";
  status: VerificationStatus;
  covers: ClauseId[];
  evidence: unknown[];
  diagnostics: Diagnostic[];
};

type RunResult = {
  status: "passed" | "failed" | "error";
  stepResults: StepResult[];
  verification: VerificationRecord[];
  diagnostics: Diagnostic[];
  artifacts: ArtifactRecord[];
};
```

### Human Checkpoints

Human input should be first-class through explicit checkpoints rather than hidden inside arbitrary workflow code.

V1 should distinguish clearly between:

- `step`
  Performs automated work
- `checkpoint`
  Pauses execution and requests human judgment or input
- `verify`
  Proves correctness or alignment against the current intent

The preferred V1 shape is first-class checkpoints such as:

- `d.checkpoint.approval(...)`
- `d.checkpoint.choice(...)`
- `d.checkpoint.input(...)`

When a checkpoint is reached:

1. The run status becomes `waiting-for-input`
2. Axiom emits a structured checkpoint request
3. Execution pauses until a response is supplied
4. The response is stored in run state and becomes available through `ctx`

This keeps workflow control distinct from proof logic and stage execution.

### Intent Revision Lifecycle

If the declared intent is wrong, incomplete, or no longer appropriate, Axiom should treat that as a definition problem rather than silently mutating intent in memory during execution.

V1 should support intent revision through explicit source-file edits to the `.axiom.js` definition file, but those edits must not take effect in the current run.

The lifecycle should be:

1. A run detects that intent needs revision, or a human decides that the current intent is wrong
2. Axiom proposes a patch or edit to the intent source file
3. The human reviews and approves or rejects that edit
4. If approved, the intent file is updated on disk
5. The current run terminates with a `requires-rerun` outcome
6. A new run starts from the revised file

This means:

- AI may propose intent edits
- humans approve whether intent changes become real
- intent changes are reviewable and versionable as source edits
- the current run never silently continues under mutated intent
- verification always applies to the immutable intent definition the current run started with

This preserves trust, reproducibility, and debuggability.

Conceptually, the runtime should support statuses such as:

- `running`
- `waiting-for-input`
- `intent-revision-proposed`
- `intent-revision-applied`
- `terminated-requires-rerun`
- `completed`
- `failed`

### Internal Module Layout

V1 should stay a single package, `@axiom/core`, but split internal modules by responsibility rather than by abstract layers.

Recommended directory layout:

```text
src/
  public/
    index.js
    intent.js
  definition/
    definition-schema.js
    definition-types.js
    finalize-definition.js
    validate-definition.js
  runtime/
    run-engine.js
    run-session.js
    step-runner.js
    step-result-normalizer.js
  context/
    create-run-context.js
  workspace/
    workspace-service.js
    artifact-service.js
  verification/
    verification-engine.js
    verification-record.js
  diagnostics/
    diagnostic.js
    trace-event.js
    run-result.js
  adapters/
    adapter-types.js
    dev-adapters.js
    test-adapters.js
  shared/
    freeze.js
    ids.js
```

The public surface should remain small and stable. Everything outside `src/public/` is internal implementation detail unless explicitly promoted later.

### Call Stack

The main runtime path should be:

1. User imports `intent`
2. `intent(definition, runFn)` finalizes and freezes an `IntentDefinition`
3. The runtime loads the file and creates a `RunSession`
4. The runtime invokes `runFn(ctx)`
5. `ctx.step(...)` executes workflow steps in source order
6. Each step returns a value or explicit envelope
7. The runtime normalizes the step result
8. The runtime records mutations, artifacts, diagnostics, and step output
9. `ctx.verify.intent(...)` and `ctx.verify.outcome(...)` execute declared checks by ID
10. Checkpoints pause the run when human input is required
11. The runtime finalizes proof state and returns `RunResult`

## Scope Boundary for V1

The first deliverable for this repo is the core JavaScript authoring and execution API. The repo should establish the authoring surface, immutable definition model, run lifecycle, and core contracts cleanly, while explicitly shaping the interfaces the verification runtime and diagnostics layer will depend on.

This means V1 should optimize for:

- expressive but minimal authoring primitives
- stable definition finalization behavior
- explicit run lifecycle and stage sequencing
- traceable clause identities and relationships
- structured verification-facing data contracts
- diagnostics and debugging metadata designed in from the start

This means V1 should not expand into:

- broad multi-runtime support
- editor extensions
- hidden default adapters or implicit execution behavior

## Open Design Constraints

- The API must feel like authored JavaScript, not JSON with commas.
- The normalized model must preserve author intent without requiring authoring to mirror internal structure.
- Every clause must be traceable through verification and diagnostics.
- Proof gaps must be representable explicitly, not inferred from missing output.
- The architecture should support future tooling and editor integrations without forcing those interfaces into V1 delivery scope.
