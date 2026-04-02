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

V1 should expose a small public API centered on two top-level entry points:

- `intent(name, defineFn)`
- `run(definition, adapters, options?)`

`intent(name, defineFn)` builds and returns an immutable `IntentDefinition`. It is definition-only and performs no execution. Authoring uses an explicit builder object passed into `defineFn`, rather than ambient global authoring state.

`run(definition, adapters, options?)` starts execution separately. The caller must provide explicit runtime adapters. `@axiom/core` may ship simple development and test adapter factories, but it should not hide default execution behavior.

Conceptually, the public API is:

```ts
type IntentDefinition = Readonly<{
  kind: "intent-definition";
  name: string;
  meta: Meta;
  intent: IntentBody;
  stages: StageDefinition[];
  verification: {
    intent: IntentVerificationDefinition[];
    outcome: OutcomeVerificationDefinition[];
  };
}>;

type RunAdapters = {
  llm: LlmAdapter;
  exec: ExecAdapter;
  workspace: WorkspaceAdapter;
  artifacts?: ArtifactAdapter;
  trace?: TraceSink;
};

type RunOptions = {
  cwd?: string;
  failFast?: boolean;
};
```

### Definition Model

The definition phase should produce a static, immutable, source-attributed `IntentDefinition`.

It should include:

- `meta`
- `what`
- `why`
- `includes`
- `excludes`
- `constraints`
- `outcomes`
- `stages`
- `verification.intent`
- `verification.outcome`

Constraints and outcomes remain separate first-class clause sets. Verification declarations stay split under `d.verify.intent(...)` and `d.verify.outcome(...)`, preserving the distinction between proving alignment with intent and proving the resulting system satisfies declared outcomes.

Conceptually, the core definition records are:

```ts
type Meta = {
  title?: string;
  summary?: string;
};

type ClauseId = string;
type StageId = string;
type VerificationId = string;

type IntentBody = {
  what?: string;
  why?: string;
  includes: string[];
  excludes: string[];
  constraints: ClauseDefinition[];
  outcomes: ClauseDefinition[];
};

type ClauseDefinition = {
  id: ClauseId;
  text: string;
  source?: SourceLocation;
};

type StageDefinition = {
  id: StageId;
  description?: string;
  run: (ctx: StageContext) => Promise<StageAuthorResult> | StageAuthorResult;
  source?: SourceLocation;
};

type IntentVerificationDefinition = {
  id: VerificationId;
  kind: "intent";
  clauses: ClauseId[];
  check: (ctx: VerificationContext) => Promise<VerificationCheckResult> | VerificationCheckResult;
  source?: SourceLocation;
};

type OutcomeVerificationDefinition = {
  id: VerificationId;
  kind: "outcome";
  clauses: ClauseId[];
  check: (ctx: VerificationContext) => Promise<VerificationCheckResult> | VerificationCheckResult;
  source?: SourceLocation;
};

type SourceLocation = {
  file?: string;
  line?: number;
  column?: number;
};
```

### Runtime Architecture

Execution begins only when `run(definition, adapters, options?)` is called.

Running a definition should:

1. Create a `RunSession`
2. Execute stages in strict declared order
3. Normalize each stage result into a standard result envelope
4. Record mutations, artifacts, diagnostics, and stage output
5. Run eligible verification checks after each stage
6. Run the full final verification pass after the last stage
7. Return a structured `RunResult`

V1 should prefer readability and predictability over graph scheduling. Dependency-based stage ordering may be added later, but it is not part of the V1 execution model.

### Stage Results

Axiom should use a structured stage result envelope with a flexible `output` field.

For V1:

- the runtime requires an internal normalized envelope
- authors may return shorthand values for ergonomics
- the explicit author-facing envelope stays minimal:
  - `output`
  - `artifacts`
  - `diagnostics`

So a stage may return an arbitrary JavaScript value, and Axiom will normalize it to the standard structure. This keeps stage-to-stage data passing predictable without forcing ceremony on authors.

Conceptually:

```ts
type StageAuthorResult =
  | unknown
  | {
      output?: unknown;
      artifacts?: ArtifactRecord[];
      diagnostics?: Diagnostic[];
    };

type StageResult = {
  stageId: StageId;
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

The live execution API is the stage or verification `ctx`, but `ctx` should be a facade over session state and explicit adapters rather than the owner of those implementations.

The caller must provide explicit adapters to `run()`. `@axiom/core` may ship simple dev/test adapters and factories, but runtime behavior must remain explicit and injected.

Conceptually:

```ts
type StageContext = {
  meta: Meta;
  intent: IntentBody;
  stageResult<T = unknown>(stageId: StageId): T | undefined;
  workspace: {
    root(): string;
    read(path: string): Promise<string>;
    write(path: string, content: string): Promise<void>;
    patch(path: string, diff: string): Promise<void>;
    list(path?: string): Promise<string[]>;
  };
  artifact(path: string): Promise<unknown>;
  llm(name: string): LlmSession;
  exec(command: string, options?: { cwd?: string }): Promise<ExecResult>;
};

type VerificationContext = StageContext & {
  currentVerificationId: VerificationId;
};

type LlmAdapter = {
  session(name: string, session: RunSession): LlmSession;
};

type ExecAdapter = {
  run(command: string, options: { cwd: string }, session: RunSession): Promise<ExecResult>;
};

type WorkspaceAdapter = {
  root(session: RunSession): string;
  read(path: string, session: RunSession): Promise<string>;
  write(path: string, content: string, session: RunSession): Promise<MutationRecord>;
  patch(path: string, diff: string, session: RunSession): Promise<MutationRecord>;
  list(path: string | undefined, session: RunSession): Promise<string[]>;
};
```

### Workspace Control and Traceability

A stage's `run(ctx)` should not perform arbitrary direct file mutation, but it should be allowed to mutate files through explicit Axiom-managed workspace APIs or injected tools. This ensures all changes remain traceable, observable, and attributable.

That means:

- direct uncontrolled file writes are outside the stage contract
- file changes must flow through Axiom-managed workspace operations or injected tools
- the runtime should record what changed, which stage caused it, and what evidence followed

### Verification Lifecycle

V1 should run verification in two moments:

- incremental verification after each stage, running checks that are now eligible
- final verification after the last stage, producing the authoritative proof result

This implies verification status is first-class. A verification check may move through states such as:

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
  clauses: ClauseId[];
  evidence: unknown[];
  diagnostics: Diagnostic[];
};

type RunResult = {
  status: "passed" | "failed" | "error";
  stageResults: StageResult[];
  verification: VerificationRecord[];
  diagnostics: Diagnostic[];
  artifacts: ArtifactRecord[];
};
```

### Human Checkpoints

Human input should be first-class through explicit checkpoints rather than hidden inside arbitrary stage code.

V1 should distinguish clearly between:

- `stage`
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
    run.js
  definition/
    intent-builder.js
    definition-types.js
    finalize-definition.js
    validate-definition.js
  runtime/
    run-engine.js
    run-session.js
    stage-runner.js
    stage-result-normalizer.js
  context/
    create-stage-context.js
    create-verification-context.js
  workspace/
    workspace-service.js
    artifact-service.js
  verification/
    verification-engine.js
    verification-eligibility.js
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

1. User imports `intent` and `run`
2. `intent(name, defineFn)` creates a builder
3. `defineFn(builder)` records metadata, clauses, stages, and verification declarations
4. Axiom finalizes and freezes an `IntentDefinition`
5. User calls `run(definition, adapters, options?)`
6. Axiom creates a `RunSession`
7. Axiom executes stages in declared order
8. Each stage receives `ctx` and returns a value or explicit envelope
9. Axiom normalizes the stage result
10. Axiom records mutations, artifacts, diagnostics, and stage output
11. Axiom runs eligible verification checks
12. Axiom performs final verification
13. Axiom returns `RunResult`

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
