# Axiom Compiler Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `ax build` feel like an AI compiler and development tool by improving live output, interruption, rebuild behavior, error quality, and example strength.

**Architecture:** Keep the current runtime and CLI structure, but tighten the user-facing execution loop around it. The runtime should emit normalized events, the CLI should render those events in readable modes, rebuild behavior should be explicit and metadata-driven, and failures should point users back to the `.axiom.js` source and the active step.

**Tech Stack:** Node.js, ESM, Vitest, child_process, filesystem metadata, CLI-backed agent adapters

---

### Task 1: Output Discipline

**Files:**
- Modify: `src/runtime/create-event-stream.js`
- Modify: `src/runtime/result-model.js`
- Modify: `src/runtime/create-run-context.js`
- Modify: `src/adapters/providers/run-cli-command.js`
- Modify: `src/adapters/providers/create-codex-cli-agent-adapter.js`
- Modify: `src/adapters/providers/create-claude-cli-agent-adapter.js`
- Modify: `src/cli/build-command.js`
- Test: `test/runtime/event-stream.test.js`
- Test: `test/cli/build-command.test.js`
- Test: `test/adapters/create-codex-cli-agent-adapter.test.js`

- [ ] **Step 1: Write failing tests for filtered default output and verbose passthrough**

Add assertions that default CLI output does not print provider session banners or skill transcript noise, while verbose mode still prints raw chunks.

```js
it('prints concise provider progress in default mode', async () => {
  const logger = createLogger();
  const exitCode = await buildCommand(['file.axiom.js'], {
    runIntentFile: async (_path, options) => {
      options.onEvent({ type: 'step.started', stepId: 'plan' });
      options.onEvent({
        type: 'step.output',
        stepId: 'plan',
        source: 'agent:planner',
        chunk: 'OpenAI Codex v0.118.0 (research preview)\n--------'
      });
      options.onEvent({
        type: 'step.output',
        stepId: 'plan',
        source: 'agent:planner',
        chunk: 'codex\nUsing `using-superpowers` first'
      });
      options.onEvent({
        type: 'step.output',
        stepId: 'plan',
        source: 'agent:planner',
        chunk: '{"includesLoadCounter":true}'
      });
      options.onEvent({ type: 'step.finished', stepId: 'plan', status: 'passed' });
      return { status: 'passed', stepResults: [], verification: [], diagnostics: [] };
    },
    logger
  });

  expect(exitCode).toBe(0);
  expect(logger.logs).not.toContain('OpenAI Codex');
  expect(logger.logs.join('\n')).not.toContain('using-superpowers');
  expect(logger.logs.join('\n')).toContain('[output:plan] {"includesLoadCounter":true}');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/cli/build-command.test.js test/adapters/create-codex-cli-agent-adapter.test.js test/runtime/event-stream.test.js`
Expected: FAIL because the CLI currently prints raw provider transcript noise.

- [ ] **Step 3: Implement normalized output classification**

Add filtering helpers so provider chunks can be marked as `progress`, `warning`, `result`, or `noise`, and only surface readable output by default.

```js
function classifyProviderChunk(chunk) {
  if (!chunk || !chunk.trim()) {
    return 'noise';
  }

  if (chunk.startsWith('warning:')) {
    return 'warning';
  }

  if (chunk.trim().startsWith('{') || chunk.trim().startsWith('[')) {
    return 'result';
  }

  if (chunk.includes('Using `using-superpowers`') || chunk.includes('OpenAI Codex v')) {
    return 'noise';
  }

  return 'progress';
}
```

- [ ] **Step 4: Implement CLI output modes**

Add default concise mode and `--verbose` passthrough in `buildCommand`.

```js
const verbose = args.includes('--verbose');

if (event.type === 'step.output') {
  if (verbose || event.visibility !== 'noise') {
    logger.log(`[output:${event.stepId}] ${event.chunk}`);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- test/cli/build-command.test.js test/adapters/create-codex-cli-agent-adapter.test.js test/runtime/event-stream.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/runtime/create-event-stream.js src/runtime/result-model.js src/runtime/create-run-context.js src/adapters/providers/run-cli-command.js src/adapters/providers/create-codex-cli-agent-adapter.js src/adapters/providers/create-claude-cli-agent-adapter.js src/cli/build-command.js test/runtime/event-stream.test.js test/cli/build-command.test.js test/adapters/create-codex-cli-agent-adapter.test.js
git commit -m "feat: normalize live compiler output"
```

### Task 2: Interrupt Handling

**Files:**
- Modify: `src/adapters/providers/run-cli-command.js`
- Modify: `src/adapters/create-local-shell-adapter.js`
- Modify: `src/runtime/result-model.js`
- Modify: `src/runtime/run-intent.js`
- Modify: `src/public/run-intent-file.js`
- Modify: `src/cli/build-command.js`
- Test: `test/adapters/create-local-shell-adapter.test.js`
- Test: `test/runtime/run-intent.test.js`
- Test: `test/cli/build-command.test.js`

- [ ] **Step 1: Write failing tests for interrupted runs**

Add tests proving that interrupting a running worker or provider marks the run as `interrupted` and returns a nonzero CLI exit code.

```js
it('marks the run as interrupted when the active process is cancelled', async () => {
  const file = intent(definition, async (ctx) => {
    await ctx.step('test', () => ctx.worker('shell').exec({ command: 'sleep 10', cwd: '/tmp' }));
  });

  const adapters = createInterruptibleAdapters();
  const resultPromise = runIntent(file, adapters);
  adapters.interrupt();
  const result = await resultPromise;

  expect(result.status).toBe('interrupted');
  expect(result.diagnostics[0].message).toContain('interrupted');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/runtime/run-intent.test.js test/cli/build-command.test.js test/adapters/create-local-shell-adapter.test.js`
Expected: FAIL because interruption state is not tracked yet.

- [ ] **Step 3: Implement interruptable child-process tracking**

Keep the active child process in adapter state and expose an `interrupt()` hook that sends `SIGINT`.

```js
let activeChild;

function interrupt() {
  activeChild?.kill('SIGINT');
}
```

- [ ] **Step 4: Propagate interruption into run status**

Convert process interruption into `result.status = 'interrupted'` with a clear diagnostic and CLI exit code `130`.

```js
if (error.code === 'INTERRUPTED') {
  result.status = 'interrupted';
  result.diagnostics.push({ message: 'Run interrupted by user.' });
  return result;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- test/runtime/run-intent.test.js test/cli/build-command.test.js test/adapters/create-local-shell-adapter.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/adapters/providers/run-cli-command.js src/adapters/create-local-shell-adapter.js src/runtime/result-model.js src/runtime/run-intent.js src/public/run-intent-file.js src/cli/build-command.js test/adapters/create-local-shell-adapter.test.js test/runtime/run-intent.test.js test/cli/build-command.test.js
git commit -m "feat: support interruptible live runs"
```

### Task 3: Clean Rebuild and Build Metadata

**Files:**
- Create: `src/runtime/build-metadata.js`
- Modify: `src/runtime/materialize-files.js`
- Modify: `src/public/run-intent-file.js`
- Modify: `examples/basic/counter-webapp.axiom.js`
- Modify: `examples/live-counter/counter-webapp.axiom.js`
- Modify: `examples/basic/README.md`
- Modify: `examples/live-counter/README.md`
- Test: `test/runtime/materialize-files.test.js`
- Test: `test/public/run-intent-file.test.js`

- [ ] **Step 1: Write failing tests for stale-build detection**

Add tests that read prior build metadata, compare it to `meta.version`, and mark the workspace as stale when they differ.

```js
it('reports stale generated output when build metadata version differs from intent version', async () => {
  const stale = await readBuildState({
    workspaceRoot: '/tmp/example',
    intentVersion: '1.1.0'
  });

  expect(stale.status).toBe('stale');
  expect(stale.previousVersion).toBe('1.0.0');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/runtime/materialize-files.test.js test/public/run-intent-file.test.js`
Expected: FAIL because no build metadata is recorded or compared.

- [ ] **Step 3: Implement build metadata writer/reader**

Write a small metadata file under the generated workspace after successful runs.

```js
export async function writeBuildMetadata(workspace, metadata) {
  await workspace.write('.axiom-build.json', JSON.stringify(metadata, null, 2));
}
```

- [ ] **Step 4: Default to clean rebuild when output is stale**

Add workspace cleanup for generated outputs before regeneration when the stored build version differs from `meta.version`.

```js
if (buildState.status === 'stale') {
  await workspace.removeGenerated();
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- test/runtime/materialize-files.test.js test/public/run-intent-file.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/runtime/build-metadata.js src/runtime/materialize-files.js src/public/run-intent-file.js examples/basic/counter-webapp.axiom.js examples/live-counter/counter-webapp.axiom.js examples/basic/README.md examples/live-counter/README.md test/runtime/materialize-files.test.js test/public/run-intent-file.test.js
git commit -m "feat: add clean rebuild metadata flow"
```

### Task 4: Compiler-Grade Errors

**Files:**
- Create: `src/runtime/format-runtime-error.js`
- Modify: `src/runtime/run-intent.js`
- Modify: `src/verification/execute-verification.js`
- Modify: `src/cli/build-command.js`
- Test: `test/runtime/run-intent.test.js`
- Test: `test/runtime/verification.test.js`
- Test: `test/cli/build-command.test.js`

- [ ] **Step 1: Write failing tests for normalized actionable errors**

Add tests that require failures to include `stepId`, `kind`, `message`, and `nextAction`.

```js
it('returns actionable diagnostics for failed verification', async () => {
  const result = await runIntent(file, adapters);

  expect(result.diagnostics[0]).toEqual({
    kind: 'verification',
    stepId: 'test',
    message: 'Outcome verification failed: counter-ui-flow.',
    nextAction: 'Update the intent or generated report so the declared outcome passes.'
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/runtime/run-intent.test.js test/runtime/verification.test.js test/cli/build-command.test.js`
Expected: FAIL because diagnostics are not normalized enough yet.

- [ ] **Step 3: Implement normalized runtime-error formatting**

Create a formatter that converts worker, provider, verification, and preflight failures into one user-facing diagnostic shape.

```js
export function formatRuntimeError(error) {
  return {
    kind: error.kind ?? 'runtime',
    stepId: error.stepId,
    message: error.message,
    nextAction: error.nextAction ?? 'Review the failing step and update the .axiom.js source.'
  };
}
```

- [ ] **Step 4: Render concise compiler-style errors in the CLI**

Print one-line errors in normal mode and include structured detail in verbose mode.

```js
for (const diagnostic of result.diagnostics) {
  logger.error(`[error:${diagnostic.kind}] ${diagnostic.message}`);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- test/runtime/run-intent.test.js test/runtime/verification.test.js test/cli/build-command.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/runtime/format-runtime-error.js src/runtime/run-intent.js src/verification/execute-verification.js src/cli/build-command.js test/runtime/run-intent.test.js test/runtime/verification.test.js test/cli/build-command.test.js
git commit -m "feat: normalize compiler-style runtime errors"
```

### Task 5: Stronger Example Coverage

**Files:**
- Create: `examples/cli/echo-tool.axiom.js`
- Create: `examples/cli/axiom.config.js`
- Create: `examples/cli/README.md`
- Modify: `README.md`
- Modify: `test/examples/examples-load.test.js`
- Create: `test/examples/echo-tool-runtime.test.js`

- [ ] **Step 1: Write failing tests for a second runnable example**

Add a test that loads and runs a tiny CLI/library-style example with deterministic adapters.

```js
it('runs the echo tool example through the runtime', async () => {
  const file = await loadIntentFile('examples/cli/echo-tool.axiom.js');
  const result = await runIntent(file, createEchoAdapters());

  expect(result.status).toBe('passed');
  expect(result.finalValue.app).toBe('echo-tool');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/examples/examples-load.test.js test/examples/echo-tool-runtime.test.js`
Expected: FAIL because the second example does not exist yet.

- [ ] **Step 3: Add the second example and docs**

Create a minimal CLI example that shows the same compile/generate/test/verify loop in a non-web project.

```js
export default intent(definition, async (ctx) => {
  const plan = await ctx.step('plan', () => ctx.agent('planner').run({ prompt }));
  await ctx.checkpoint.approval('approve-plan', { message: 'Approve the echo tool plan?', data: plan });
  const implementation = await ctx.step('implement', () => ctx.agent('coder').run({ prompt }));
  await materializeFiles(ctx.workspace, implementation.files);
  await ctx.step('test', () => ctx.worker('shell').exec({ command: 'npm test', cwd: ctx.workspace.root() }));
  await ctx.verify.outcome('echo-works', { severity: 'error', run: async () => ({ passed: true }) });
  return { ok: true, app: 'echo-tool' };
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- test/examples/examples-load.test.js test/examples/echo-tool-runtime.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add examples/cli README.md test/examples/examples-load.test.js test/examples/echo-tool-runtime.test.js
git commit -m "docs: add second runnable compiler example"
```

### Task 6: Final Verification and Acceptance

**Files:**
- Modify: `docs/superpowers/specs/axiom-mvp-acceptance.md`
- Modify: `README.md`

- [ ] **Step 1: Update the acceptance doc**

Add the new compiler-experience proof points:
- concise default output
- verbose raw transcript mode
- interrupt handling
- clean rebuild metadata
- actionable runtime errors
- two runnable examples

- [ ] **Step 2: Run the full automated suite**

Run: `npm test`
Expected: PASS with all default tests green and the guarded OpenAI integration test still skipped without credentials.

- [ ] **Step 3: Run the manual live smoke again**

Run: `node bin/ax.js build examples/live-counter/counter-webapp.axiom.js`
Expected: PASS with readable live output, successful install/test/verify, and final `status: "passed"`.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/axiom-mvp-acceptance.md README.md
git commit -m "docs: record compiler experience acceptance"
```
