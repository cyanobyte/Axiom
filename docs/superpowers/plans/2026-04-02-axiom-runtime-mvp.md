# Axiom Runtime MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working Axiom runtime so a single `.axiom.js` file can define intent declaratively and execute a top-to-bottom workflow with explicit checkpoints, verification, and structured run results.

**Architecture:** The implementation is centered on `intent(definition, runFn)`. The declarative definition is validated and frozen, then the runtime loads a module, resolves explicit adapters, creates `ctx`, executes `ctx.step(...)` in normal JavaScript order, and records checkpoints, verification, artifacts, diagnostics, and rerun-required outcomes. Canonical examples in `docs/superpowers/examples/` are treated as contract fixtures for the API surface.

**Tech Stack:** Node.js, JavaScript (ES modules), Vitest

---

## File Structure

### Package and Tooling

- Create: `package.json`
- Create: `vitest.config.js`
- Modify: `.gitignore`

### Public API

- Create: `src/index.js`
- Create: `src/public/intent.js`
- Create: `src/public/load-intent-file.js`
- Create: `src/public/run-intent-file.js`

### Definition and Validation

- Create: `src/definition/helpers.js`
- Create: `src/definition/finalize-definition.js`
- Create: `src/definition/validate-definition.js`
- Create: `src/definition/recognized-sections.js`

### Runtime

- Create: `src/runtime/run-intent.js`
- Create: `src/runtime/create-run-context.js`
- Create: `src/runtime/step-runner.js`
- Create: `src/runtime/result-model.js`
- Create: `src/runtime/checkpoints.js`
- Create: `src/runtime/intent-revision.js`

### Verification and Diagnostics

- Create: `src/verification/execute-verification.js`
- Create: `src/verification/find-verification.js`
- Create: `src/diagnostics/create-diagnostic.js`

### Test Adapters

- Create: `src/adapters/test-adapters.js`

### Tests

- Create: `test/definition/validate-definition.test.js`
- Create: `test/public/load-intent-file.test.js`
- Create: `test/runtime/run-intent.test.js`
- Create: `test/runtime/checkpoints.test.js`
- Create: `test/runtime/verification.test.js`
- Create: `test/runtime/intent-revision.test.js`
- Create: `test/examples/examples-load.test.js`

## Task 1: Establish the package and test baseline

**Files:**
- Create: `package.json`
- Create: `vitest.config.js`
- Modify: `.gitignore`
- Test: `npm test`

- [ ] **Step 1: Write the package and config files**

```json
{
  "name": "axiom",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.2.4"
  }
}
```

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    passWithNoTests: true,
    include: ['test/**/*.test.js']
  }
});
```

```gitignore
node_modules/
coverage/
.worktrees/
```

- [ ] **Step 2: Install dependencies and verify the empty suite runs**

Run: `npm install`
Expected: install completes and creates `package-lock.json`

Run: `npm test`
Expected: PASS with `No test files found, exiting with code 0`

- [ ] **Step 3: Commit the tooling baseline**

```bash
git add package.json package-lock.json vitest.config.js .gitignore
git commit -m "chore: initialize axiom runtime package"
```

## Task 2: Define the public API entrypoint and helper constructors

**Files:**
- Create: `src/index.js`
- Create: `src/public/intent.js`
- Create: `src/definition/helpers.js`
- Create: `test/definition/validate-definition.test.js`
- Test: `test/definition/validate-definition.test.js`

- [ ] **Step 1: Write the failing helper and definition construction tests**

```js
import { describe, expect, it } from 'vitest';
import { intent, must, should, outcome, verify } from '../../src/index.js';

describe('intent helpers', () => {
  it('builds an immutable intent definition with helper records', () => {
    const file = intent(
      {
        id: 'sample',
        meta: { title: 'Sample' },
        what: { capability: 'sample', description: 'Sample app' },
        why: { problem: 'Need sample', value: 'Demonstrate runtime' },
        scope: { includes: ['x'], excludes: ['y'] },
        runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
        constraints: [must('must-exist', 'Constraint exists')],
        outcomes: [outcome('works', 'It works')],
        verification: {
          intent: [verify('plan-covers-core', ['must-exist'])],
          outcome: [verify('works-check', ['works'])]
        },
        library: { kind: 'package' }
      },
      async () => ({ ok: true })
    );

    expect(file.kind).toBe('intent-file');
    expect(file.definition.id).toBe('sample');
    expect(Object.isFrozen(file.definition)).toBe(true);
    expect(file.definition.constraints[0]).toEqual({
      id: 'must-exist',
      text: 'Constraint exists',
      severity: 'error'
    });
    expect(file.definition.outcomes[0]).toEqual({
      id: 'works',
      text: 'It works'
    });
    expect(file.definition.verification.intent[0]).toEqual({
      id: 'plan-covers-core',
      covers: ['must-exist']
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/definition/validate-definition.test.js`
Expected: FAIL with missing exports from `src/index.js`

- [ ] **Step 3: Write the minimal API and helpers**

```js
// src/definition/helpers.js
export function must(id, text) {
  return { id, text, severity: 'error' };
}

export function should(id, text) {
  return { id, text, severity: 'warn' };
}

export function outcome(id, text) {
  return { id, text };
}

export function verify(id, covers) {
  return { id, covers };
}
```

```js
// src/public/intent.js
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
  }
  return value;
}

export function intent(definition, runFn) {
  return {
    kind: 'intent-file',
    definition: deepFreeze(structuredClone(definition)),
    runFn
  };
}
```

```js
// src/index.js
export { intent } from './public/intent.js';
export { must, should, outcome, verify } from './definition/helpers.js';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- test/definition/validate-definition.test.js`
Expected: PASS

- [ ] **Step 5: Commit the helper slice**

```bash
git add src/index.js src/public/intent.js src/definition/helpers.js test/definition/validate-definition.test.js
git commit -m "feat: add intent constructor and helper records"
```

## Task 3: Validate recognized sections and verification coverage

**Files:**
- Create: `src/definition/recognized-sections.js`
- Create: `src/definition/validate-definition.js`
- Modify: `src/public/intent.js`
- Modify: `test/definition/validate-definition.test.js`
- Test: `test/definition/validate-definition.test.js`

- [ ] **Step 1: Extend the test with validation failures**

```js
it('fails when an unknown top-level section is present', () => {
  expect(() =>
    intent(
      {
        id: 'broken',
        meta: { title: 'Broken' },
        what: { capability: 'sample', description: 'Broken app' },
        why: { problem: 'Need sample', value: 'Demonstrate runtime' },
        scope: { includes: [], excludes: [] },
        runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
        constraints: [must('must-exist', 'Constraint exists')],
        outcomes: [outcome('works', 'It works')],
        verification: { intent: [verify('plan-covers-core', ['must-exist'])], outcome: [] },
        library: { kind: 'package' },
        mystery: true
      },
      async () => ({ ok: true })
    )
  ).toThrow(/Unknown top-level section: mystery/);
});

it('fails when verification covers an unknown clause id', () => {
  expect(() =>
    intent(
      {
        id: 'broken-coverage',
        meta: { title: 'Broken Coverage' },
        what: { capability: 'sample', description: 'Broken app' },
        why: { problem: 'Need sample', value: 'Demonstrate runtime' },
        scope: { includes: [], excludes: [] },
        runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
        constraints: [must('must-exist', 'Constraint exists')],
        outcomes: [outcome('works', 'It works')],
        verification: {
          intent: [verify('plan-covers-core', ['missing-clause'])],
          outcome: []
        },
        library: { kind: 'package' }
      },
      async () => ({ ok: true })
    )
  ).toThrow(/Unknown verification coverage id: missing-clause/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- test/definition/validate-definition.test.js`
Expected: FAIL because validation is not implemented

- [ ] **Step 3: Implement minimal validation**

```js
// src/definition/recognized-sections.js
export const REQUIRED_SECTIONS = [
  'id',
  'meta',
  'what',
  'why',
  'scope',
  'runtime',
  'constraints',
  'outcomes',
  'verification'
];

export const OPTIONAL_SECTIONS = [
  'build',
  'assumptions',
  'architecture',
  'policies',
  'quality_attributes',
  'web',
  'cli',
  'service',
  'library',
  'desktop',
  'mobile'
];

export const DOMAIN_SECTIONS = ['web', 'cli', 'service', 'library', 'desktop', 'mobile'];
```

```js
// src/definition/validate-definition.js
import { DOMAIN_SECTIONS, OPTIONAL_SECTIONS, REQUIRED_SECTIONS } from './recognized-sections.js';

export function validateDefinition(definition) {
  for (const key of REQUIRED_SECTIONS) {
    if (!(key in definition)) {
      throw new Error(`Missing required section: ${key}`);
    }
  }

  const allowed = new Set([...REQUIRED_SECTIONS, ...OPTIONAL_SECTIONS]);
  for (const key of Object.keys(definition)) {
    if (!allowed.has(key)) {
      throw new Error(`Unknown top-level section: ${key}`);
    }
  }

  if (!DOMAIN_SECTIONS.some((key) => key in definition)) {
    throw new Error('At least one domain section is required');
  }

  const clauseIds = new Set([
    ...definition.constraints.map((item) => item.id),
    ...definition.outcomes.map((item) => item.id)
  ]);

  for (const group of ['intent', 'outcome']) {
    for (const item of definition.verification[group]) {
      for (const covered of item.covers) {
        if (!clauseIds.has(covered)) {
          throw new Error(`Unknown verification coverage id: ${covered}`);
        }
      }
    }
  }

  return definition;
}
```

```js
// src/public/intent.js
import { validateDefinition } from '../definition/validate-definition.js';

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
  }
  return value;
}

export function intent(definition, runFn) {
  const validated = validateDefinition(structuredClone(definition));
  return {
    kind: 'intent-file',
    definition: deepFreeze(validated),
    runFn
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- test/definition/validate-definition.test.js`
Expected: PASS

- [ ] **Step 5: Commit the validation slice**

```bash
git add src/definition/recognized-sections.js src/definition/validate-definition.js src/public/intent.js test/definition/validate-definition.test.js
git commit -m "feat: validate intent definitions and coverage"
```

## Task 4: Load authored files and verify canonical examples

**Files:**
- Create: `src/public/load-intent-file.js`
- Modify: `src/index.js`
- Create: `test/public/load-intent-file.test.js`
- Create: `test/examples/examples-load.test.js`
- Test: `test/public/load-intent-file.test.js`
- Test: `test/examples/examples-load.test.js`

- [ ] **Step 1: Write the failing load tests**

```js
import { describe, expect, it } from 'vitest';
import { loadIntentFile } from '../../src/index.js';

describe('loadIntentFile', () => {
  it('loads an authored intent module from disk', async () => {
    const file = await loadIntentFile('docs/superpowers/examples/todo-app.axiom.js');

    expect(file.kind).toBe('intent-file');
    expect(file.definition.id).toBe('todo-webapp-mvp');
  });
});
```

```js
import { describe, expect, it } from 'vitest';
import { loadIntentFile } from '../../src/index.js';

describe('canonical examples', () => {
  it('loads the todo app example', async () => {
    const file = await loadIntentFile('docs/superpowers/examples/todo-app.axiom.js');
    expect(file.definition.id).toBe('todo-webapp-mvp');
  });

  it('loads the axiom runtime example', async () => {
    const file = await loadIntentFile('docs/superpowers/examples/axiom-runtime.axiom.js');
    expect(file.definition.id).toBe('axiom-runtime-mvp');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- test/public/load-intent-file.test.js test/examples/examples-load.test.js`
Expected: FAIL with missing `loadIntentFile` export

- [ ] **Step 3: Implement file loading**

```js
// src/public/load-intent-file.js
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function loadIntentFile(filePath) {
  const absolutePath = path.resolve(filePath);
  const module = await import(pathToFileURL(absolutePath).href);

  if (!module.default || module.default.kind !== 'intent-file') {
    throw new Error(`Intent module did not export a valid intent file: ${filePath}`);
  }

  return module.default;
}
```

```js
// src/index.js
export { intent } from './public/intent.js';
export { loadIntentFile } from './public/load-intent-file.js';
export { must, should, outcome, verify } from './definition/helpers.js';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- test/public/load-intent-file.test.js test/examples/examples-load.test.js`
Expected: PASS

- [ ] **Step 5: Commit the loading slice**

```bash
git add src/public/load-intent-file.js src/index.js test/public/load-intent-file.test.js test/examples/examples-load.test.js
git commit -m "feat: load authored intent files from disk"
```

## Task 5: Execute steps in source order and return a structured run result

**Files:**
- Create: `src/runtime/result-model.js`
- Create: `src/runtime/step-runner.js`
- Create: `src/runtime/create-run-context.js`
- Create: `src/runtime/run-intent.js`
- Create: `src/adapters/test-adapters.js`
- Create: `test/runtime/run-intent.test.js`
- Modify: `src/index.js`
- Test: `test/runtime/run-intent.test.js`

- [ ] **Step 1: Write the failing runtime execution test**

```js
import { describe, expect, it } from 'vitest';
import { intent, must, outcome, runIntent } from '../../src/index.js';
import { createTestAdapters } from '../../src/adapters/test-adapters.js';

describe('runIntent', () => {
  it('executes steps in source order and returns structured results', async () => {
    const order = [];

    const file = intent(
      {
        id: 'runtime-sample',
        meta: { title: 'Runtime Sample' },
        what: { capability: 'sample', description: 'Sample runtime' },
        why: { problem: 'Need runtime', value: 'Verify source order' },
        scope: { includes: [], excludes: [] },
        runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
        constraints: [must('must-exist', 'Constraint exists')],
        outcomes: [outcome('works', 'It works')],
        verification: { intent: [], outcome: [] },
        library: { kind: 'package' }
      },
      async (ctx) => {
        await ctx.step('first', async () => {
          order.push('first');
          return { value: 1 };
        });
        await ctx.step('second', async () => {
          order.push('second');
          return { value: 2 };
        });
        return { ok: true };
      }
    );

    const result = await runIntent(file, createTestAdapters());

    expect(order).toEqual(['first', 'second']);
    expect(result.status).toBe('passed');
    expect(result.stepResults.map((item) => item.stepId)).toEqual(['first', 'second']);
    expect(result.finalValue).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/runtime/run-intent.test.js`
Expected: FAIL with missing `runIntent` export

- [ ] **Step 3: Implement minimal runtime execution**

```js
// src/runtime/result-model.js
export function createRunResult() {
  return {
    status: 'passed',
    stepResults: [],
    verification: [],
    diagnostics: [],
    artifacts: [],
    finalValue: undefined
  };
}
```

```js
// src/runtime/step-runner.js
export async function runStep(state, stepId, run) {
  const startedAt = new Date().toISOString();
  const output = await run();
  const finishedAt = new Date().toISOString();

  const record = {
    stepId,
    status: 'passed',
    startedAt,
    finishedAt,
    output,
    artifacts: [],
    diagnostics: [],
    mutations: []
  };

  state.stepResults.push(record);
  state.stepMap.set(stepId, output);
  return output;
}
```

```js
// src/runtime/create-run-context.js
import { runStep } from './step-runner.js';

export function createRunContext(file, adapters, state) {
  return {
    meta: file.definition.meta,
    intent: file.definition,
    step(stepId, run) {
      return runStep(state, stepId, run);
    },
    stepResult(stepId) {
      return state.stepMap.get(stepId);
    },
    workspace: adapters.workspace,
    artifact(path) {
      return adapters.artifacts.read(path);
    },
    agent(name) {
      return adapters.ai.agent(name);
    },
    worker(name) {
      return adapters.workers.worker(name);
    },
    verify: adapters.verify,
    checkpoint: adapters.checkpoint
  };
}
```

```js
// src/runtime/run-intent.js
import { createRunResult } from './result-model.js';
import { createRunContext } from './create-run-context.js';

export async function runIntent(file, adapters) {
  const result = createRunResult();
  const state = {
    stepResults: result.stepResults,
    stepMap: new Map()
  };

  const ctx = createRunContext(file, adapters, state);
  result.finalValue = await file.runFn(ctx);
  return result;
}
```

```js
// src/adapters/test-adapters.js
export function createTestAdapters() {
  return {
    workspace: {
      root() {
        return '/tmp/axiom-test';
      },
      async read() {
        return '';
      },
      async write() {},
      async patch() {}
    },
    artifacts: {
      async read() {
        return null;
      }
    },
    ai: {
      agent() {
        return {
          async run(input) {
            return input;
          }
        };
      }
    },
    workers: {
      worker() {
        return {
          async exec(spec) {
            return spec;
          }
        };
      }
    },
    verify: {
      async intent() {
        return { status: 'passed' };
      },
      async outcome() {
        return { status: 'passed' };
      }
    },
    checkpoint: {
      async approval() {
        return { accepted: true };
      },
      async choice() {
        return { value: null };
      },
      async input() {
        return { value: null };
      }
    }
  };
}
```

```js
// src/index.js
export { intent } from './public/intent.js';
export { loadIntentFile } from './public/load-intent-file.js';
export { runIntent } from './runtime/run-intent.js';
export { must, should, outcome, verify } from './definition/helpers.js';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- test/runtime/run-intent.test.js`
Expected: PASS

- [ ] **Step 5: Commit the runtime execution slice**

```bash
git add src/runtime/result-model.js src/runtime/step-runner.js src/runtime/create-run-context.js src/runtime/run-intent.js src/adapters/test-adapters.js src/index.js test/runtime/run-intent.test.js
git commit -m "feat: execute intent runtime steps in source order"
```

## Task 6: Implement verification by declared ID

**Files:**
- Create: `src/verification/find-verification.js`
- Create: `src/verification/execute-verification.js`
- Modify: `src/runtime/create-run-context.js`
- Create: `test/runtime/verification.test.js`
- Test: `test/runtime/verification.test.js`

- [ ] **Step 1: Write the failing verification test**

```js
import { describe, expect, it } from 'vitest';
import { intent, must, outcome, verify, runIntent } from '../../src/index.js';
import { createTestAdapters } from '../../src/adapters/test-adapters.js';

describe('verification execution', () => {
  it('runs verification by declared id and records coverage', async () => {
    const file = intent(
      {
        id: 'verify-sample',
        meta: { title: 'Verify Sample' },
        what: { capability: 'sample', description: 'Sample runtime' },
        why: { problem: 'Need runtime', value: 'Verify checks' },
        scope: { includes: [], excludes: [] },
        runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
        constraints: [must('must-exist', 'Constraint exists')],
        outcomes: [outcome('works', 'It works')],
        verification: {
          intent: [verify('plan-covers-core', ['must-exist'])],
          outcome: [verify('works-check', ['works'])]
        },
        library: { kind: 'package' }
      },
      async (ctx) => {
        await ctx.verify.intent('plan-covers-core', {
          severity: 'error',
          run: async () => ({ passed: true, evidence: { ok: true } })
        });
        return { ok: true };
      }
    );

    const result = await runIntent(file, createTestAdapters());

    expect(result.verification).toEqual([
      {
        verificationId: 'plan-covers-core',
        kind: 'intent',
        status: 'passed',
        covers: ['must-exist'],
        evidence: [{ ok: true }],
        diagnostics: [],
        severity: 'error'
      }
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/runtime/verification.test.js`
Expected: FAIL because verification records are not stored

- [ ] **Step 3: Implement minimal verification execution**

```js
// src/verification/find-verification.js
export function findVerification(definition, kind, verificationId) {
  const match = definition.verification[kind].find((item) => item.id === verificationId);
  if (!match) {
    throw new Error(`Unknown verification id: ${verificationId}`);
  }
  return match;
}
```

```js
// src/verification/execute-verification.js
import { findVerification } from './find-verification.js';

export async function executeVerification(definition, result, kind, verificationId, spec) {
  const declaration = findVerification(definition, kind, verificationId);
  const check = await spec.run();

  const record = {
    verificationId,
    kind,
    status: check.passed ? 'passed' : 'failed',
    covers: declaration.covers,
    evidence: check.evidence === undefined ? [] : [check.evidence],
    diagnostics: check.diagnostics ?? [],
    severity: spec.severity ?? 'error'
  };

  result.verification.push(record);
  return record;
}
```

```js
// src/runtime/create-run-context.js
import { executeVerification } from '../verification/execute-verification.js';
import { runStep } from './step-runner.js';

export function createRunContext(file, adapters, state, result) {
  return {
    meta: file.definition.meta,
    intent: file.definition,
    step(stepId, run) {
      return runStep(state, stepId, run);
    },
    stepResult(stepId) {
      return state.stepMap.get(stepId);
    },
    workspace: adapters.workspace,
    artifact(path) {
      return adapters.artifacts.read(path);
    },
    agent(name) {
      return adapters.ai.agent(name);
    },
    worker(name) {
      return adapters.workers.worker(name);
    },
    verify: {
      intent(verificationId, spec) {
        return executeVerification(file.definition, result, 'intent', verificationId, spec);
      },
      outcome(verificationId, spec) {
        return executeVerification(file.definition, result, 'outcome', verificationId, spec);
      }
    },
    checkpoint: adapters.checkpoint
  };
}
```

```js
// src/runtime/run-intent.js
import { createRunResult } from './result-model.js';
import { createRunContext } from './create-run-context.js';

export async function runIntent(file, adapters) {
  const result = createRunResult();
  const state = {
    stepResults: result.stepResults,
    stepMap: new Map()
  };

  const ctx = createRunContext(file, adapters, state, result);
  result.finalValue = await file.runFn(ctx);
  return result;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- test/runtime/verification.test.js`
Expected: PASS

- [ ] **Step 5: Commit the verification slice**

```bash
git add src/verification/find-verification.js src/verification/execute-verification.js src/runtime/create-run-context.js src/runtime/run-intent.js test/runtime/verification.test.js
git commit -m "feat: execute declared verification by id"
```

## Task 7: Implement checkpoints and rerun-required intent revision results

**Files:**
- Create: `src/runtime/checkpoints.js`
- Create: `src/runtime/intent-revision.js`
- Modify: `src/adapters/test-adapters.js`
- Modify: `src/runtime/create-run-context.js`
- Modify: `src/runtime/result-model.js`
- Create: `test/runtime/checkpoints.test.js`
- Create: `test/runtime/intent-revision.test.js`
- Test: `test/runtime/checkpoints.test.js`
- Test: `test/runtime/intent-revision.test.js`

- [ ] **Step 1: Write the failing checkpoint and intent revision tests**

```js
import { describe, expect, it } from 'vitest';
import { intent, must, outcome, runIntent } from '../../src/index.js';
import { createTestAdapters } from '../../src/adapters/test-adapters.js';

describe('checkpoints', () => {
  it('stores pending checkpoint data when approval is requested', async () => {
    const file = intent(
      {
        id: 'checkpoint-sample',
        meta: { title: 'Checkpoint Sample' },
        what: { capability: 'sample', description: 'Sample runtime' },
        why: { problem: 'Need checkpoints', value: 'Pause safely' },
        scope: { includes: [], excludes: [] },
        runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
        constraints: [must('must-exist', 'Constraint exists')],
        outcomes: [outcome('works', 'It works')],
        verification: { intent: [], outcome: [] },
        library: { kind: 'package' }
      },
      async (ctx) => {
        await ctx.checkpoint.approval('approve-plan', {
          message: 'Approve?',
          data: { ok: true }
        });
        return { ok: true };
      }
    );

    const adapters = createTestAdapters({
      checkpointApprovalResult: { accepted: false, pending: true }
    });
    const result = await runIntent(file, adapters);

    expect(result.status).toBe('waiting-for-input');
    expect(result.pendingCheckpoint).toEqual({
      id: 'approve-plan',
      kind: 'approval',
      message: 'Approve?',
      data: { ok: true }
    });
  });
});
```

```js
import { describe, expect, it } from 'vitest';
import { intent, must, outcome, runIntent } from '../../src/index.js';
import { createTestAdapters } from '../../src/adapters/test-adapters.js';

describe('intent revision', () => {
  it('marks the run as requiring rerun when an intent revision is applied', async () => {
    const file = intent(
      {
        id: 'revision-sample',
        meta: { title: 'Revision Sample' },
        what: { capability: 'sample', description: 'Sample runtime' },
        why: { problem: 'Need revisions', value: 'Require rerun' },
        scope: { includes: [], excludes: [] },
        runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
        constraints: [must('must-exist', 'Constraint exists')],
        outcomes: [outcome('works', 'It works')],
        verification: { intent: [], outcome: [] },
        library: { kind: 'package' }
      },
      async (ctx) => {
        await ctx.reviseIntent({
          filePath: 'sample.axiom.js',
          patch: 'patch-content'
        });
        return { ok: true };
      }
    );

    const result = await runIntent(file, createTestAdapters());

    expect(result.status).toBe('terminated-requires-rerun');
    expect(result.intentRevision).toEqual({
      filePath: 'sample.axiom.js',
      patch: 'patch-content'
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- test/runtime/checkpoints.test.js test/runtime/intent-revision.test.js`
Expected: FAIL because pending checkpoint and intent revision state are not stored

- [ ] **Step 3: Implement checkpoint and revision handling**

```js
// src/runtime/checkpoints.js
export async function requestApproval(result, adapters, checkpointId, spec) {
  const response = await adapters.checkpoint.approval(checkpointId, spec);
  if (response?.pending) {
    result.status = 'waiting-for-input';
    result.pendingCheckpoint = {
      id: checkpointId,
      kind: 'approval',
      message: spec.message,
      data: spec.data
    };
  }
  return response;
}
```

```js
// src/runtime/intent-revision.js
export function applyIntentRevision(result, revision) {
  result.status = 'terminated-requires-rerun';
  result.intentRevision = revision;
  return revision;
}
```

```js
// src/runtime/result-model.js
export function createRunResult() {
  return {
    status: 'passed',
    stepResults: [],
    verification: [],
    diagnostics: [],
    artifacts: [],
    finalValue: undefined,
    pendingCheckpoint: undefined,
    intentRevision: undefined
  };
}
```

```js
// src/adapters/test-adapters.js
export function createTestAdapters(options = {}) {
  return {
    workspace: {
      root() {
        return '/tmp/axiom-test';
      },
      async read() {
        return '';
      },
      async write() {},
      async patch() {}
    },
    artifacts: {
      async read() {
        return null;
      }
    },
    ai: {
      agent() {
        return {
          async run(input) {
            return input;
          }
        };
      }
    },
    workers: {
      worker() {
        return {
          async exec(spec) {
            return spec;
          }
        };
      }
    },
    checkpoint: {
      async approval(_id, _spec) {
        return options.checkpointApprovalResult ?? { accepted: true };
      },
      async choice() {
        return { value: null };
      },
      async input() {
        return { value: null };
      }
    }
  };
}
```

```js
// src/runtime/create-run-context.js
import { requestApproval } from './checkpoints.js';
import { applyIntentRevision } from './intent-revision.js';
import { executeVerification } from '../verification/execute-verification.js';
import { runStep } from './step-runner.js';

export function createRunContext(file, adapters, state, result) {
  return {
    meta: file.definition.meta,
    intent: file.definition,
    step(stepId, run) {
      return runStep(state, stepId, run);
    },
    stepResult(stepId) {
      return state.stepMap.get(stepId);
    },
    workspace: adapters.workspace,
    artifact(path) {
      return adapters.artifacts.read(path);
    },
    agent(name) {
      return adapters.ai.agent(name);
    },
    worker(name) {
      return adapters.workers.worker(name);
    },
    verify: {
      intent(verificationId, spec) {
        return executeVerification(file.definition, result, 'intent', verificationId, spec);
      },
      outcome(verificationId, spec) {
        return executeVerification(file.definition, result, 'outcome', verificationId, spec);
      }
    },
    checkpoint: {
      approval(checkpointId, spec) {
        return requestApproval(result, adapters, checkpointId, spec);
      },
      choice(checkpointId, spec) {
        return adapters.checkpoint.choice(checkpointId, spec);
      },
      input(checkpointId, spec) {
        return adapters.checkpoint.input(checkpointId, spec);
      }
    },
    reviseIntent(revision) {
      return applyIntentRevision(result, revision);
    }
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- test/runtime/checkpoints.test.js test/runtime/intent-revision.test.js`
Expected: PASS

- [ ] **Step 5: Commit the checkpoint and revision slice**

```bash
git add src/runtime/checkpoints.js src/runtime/intent-revision.js src/runtime/result-model.js src/runtime/create-run-context.js src/adapters/test-adapters.js test/runtime/checkpoints.test.js test/runtime/intent-revision.test.js
git commit -m "feat: add checkpoints and intent revision state"
```

## Task 8: Run the full suite and verify both canonical examples still load

**Files:**
- Modify: `test/examples/examples-load.test.js`
- Test: `npm test`

- [ ] **Step 1: Add one regression assertion per canonical example**

```js
// add to test/examples/examples-load.test.js
expect(file.definition.verification.intent.length).toBeGreaterThan(0);
expect(file.runFn).toBeTypeOf('function');
```

```js
// for axiom-runtime example
expect(file.definition.library.kind).toBe('package');
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS with all `test/**/*.test.js` files green

- [ ] **Step 3: Commit the full-suite verification pass**

```bash
git add test/examples/examples-load.test.js
git commit -m "test: verify canonical intent examples load successfully"
```

## Spec Coverage Check

- Declarative `intent(definition, runFn)` API: covered by Tasks 2 and 3
- Recognized sections and schema validation: covered by Task 3
- File loading and runtime entry: covered by Task 4
- Source-order step execution: covered by Task 5
- `ctx.intent` and explicit runtime surface: covered by Tasks 5, 6, and 7
- Verification by declared ID: covered by Task 6
- Human checkpoints: covered by Task 7
- Intent revision plus rerun boundary: covered by Task 7
- Structured run result model: covered by Tasks 5 and 7
- Canonical examples as contract fixtures: covered by Tasks 4 and 8

## Self-Review Notes

- Placeholder scan: complete; every task includes exact files, tests, commands, and commit points.
- Type consistency: this plan consistently uses `intent(definition, runFn)`, `ctx.step`, `ctx.verify`, `ctx.checkpoint`, `ctx.intent`, `runIntent`, and `StepResult`.
- Scope check: this plan is limited to the core runtime MVP and deliberately does not include plugin systems, multi-file composition, or a custom debugger.
