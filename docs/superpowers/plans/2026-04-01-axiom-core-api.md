# Axiom Core API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first intent runtime API so engineers can author a declarative intent object plus runtime workflow callback in a single executable JavaScript file.

**Architecture:** The implementation centers on `intent(definition, runFn)`, where the definition object stays declarative and inspectable while the runtime callback executes `ctx.step(...)`, `ctx.verify.*(...)`, and `ctx.checkpoint...(...)`. Verification IDs and coverage are declared statically, while proof execution happens dynamically by referencing those declarations during the run.

**Tech Stack:** Node.js, JavaScript (ES modules), Vitest

**Canonical Example:** [`docs/superpowers/examples/todo-app.axiom.js`](/mnt/d/Science451/Axiom/docs/superpowers/examples/todo-app.axiom.js) is the reference authored file for this plan. API and runtime changes should remain consistent with it.

---

## File Structure

### Package and Tooling

- Create: `package.json`
- Create: `vitest.config.js`
- Create: `.gitignore`

### Public API Surface

- Create: `src/index.js`
- Create: `src/api/system.js`
- Create: `src/api/clauses.js`
- Create: `src/api/checks.js`

### Normalization and Model

- Create: `src/model/normalize.js`
- Create: `src/model/ids.js`
- Create: `src/model/source-location.js`
- Create: `src/model/schema.js`

### Errors and Diagnostics Contracts

- Create: `src/errors/axiom-error.js`
- Create: `src/errors/normalization-error.js`
- Create: `src/contracts/diagnostics.js`
- Create: `src/contracts/verification.js`

### Test Fixtures and Tests

- Create: `test/fixtures/todo-system.js`
- Create: `test/api/authoring-api.test.js`
- Create: `test/model/normalize.test.js`
- Create: `test/model/traceability.test.js`
- Create: `test/contracts/debug-metadata.test.js`

## Task 1: Establish the package, test runner, and repo baseline

**Files:**
- Create: `package.json`
- Create: `vitest.config.js`
- Modify: `.gitignore`
- Test: `npm test`

- [ ] **Step 1: Write the failing package and config files**

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
    "vitest": "^3.0.0"
  }
}
```

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js']
  }
});
```

```gitignore
node_modules/
coverage/
```

- [ ] **Step 2: Install dependencies and verify the empty suite runs**

Run: `npm install`
Expected: install completes and creates `package-lock.json`

Run: `npm test`
Expected: PASS with output indicating no test files were found, or PASS after later tasks add tests

- [ ] **Step 3: Commit the tooling baseline**

```bash
git add package.json package-lock.json vitest.config.js .gitignore
git commit -m "chore: initialize axiom package tooling"
```

## Task 2: Define the first end-to-end authoring fixture and public API shape

**Files:**
- Create: `src/index.js`
- Create: `src/api/system.js`
- Create: `src/api/clauses.js`
- Create: `src/api/checks.js`
- Create: `test/fixtures/todo-system.js`
- Create: `test/api/authoring-api.test.js`
- Test: `test/api/authoring-api.test.js`

- [ ] **Step 1: Write the failing authoring API test**

```js
import { describe, expect, it } from 'vitest';
import todoSystem from '../fixtures/todo-system.js';

describe('authoring api', () => {
  it('supports spec-like authored modules without giant nested objects', () => {
    expect(todoSystem.kind).toBe('system');
    expect(todoSystem.name).toBe('todo-service');
    expect(todoSystem.why).toBe('Help teams track work reliably.');
    expect(todoSystem.clauses.map((clause) => clause.kind)).toEqual([
      'requirement',
      'constraint',
      'success-criterion',
      'verification'
    ]);
    expect(typeof todoSystem.clauses[3].run).toBe('function');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/api/authoring-api.test.js`
Expected: FAIL with module resolution errors for `src/index.js` or the fixture imports

- [ ] **Step 3: Write the minimal public API and fixture**

```js
// src/api/system.js
export function system(name, definition) {
  const state = {
    kind: 'system',
    name,
    why: '',
    clauses: []
  };

  const builder = {
    why(reason) {
      state.why = reason;
      return builder;
    },
    requirement(id, text) {
      state.clauses.push({ kind: 'requirement', id, text });
      return builder;
    },
    constraint(id, text) {
      state.clauses.push({ kind: 'constraint', id, text });
      return builder;
    },
    successCriterion(id, text) {
      state.clauses.push({ kind: 'success-criterion', id, text });
      return builder;
    },
    verification(id, text, run) {
      state.clauses.push({ kind: 'verification', id, text, run });
      return builder;
    }
  };

  definition(builder);
  return Object.freeze({
    ...state,
    clauses: Object.freeze([...state.clauses])
  });
}
```

```js
// src/index.js
export { system } from './api/system.js';
```

```js
// src/api/clauses.js
export function requirement(id, text) {
  return { kind: 'requirement', id, text };
}

export function constraint(id, text) {
  return { kind: 'constraint', id, text };
}

export function successCriterion(id, text) {
  return { kind: 'success-criterion', id, text };
}
```

```js
// src/api/checks.js
export function verification(id, text, run) {
  return { kind: 'verification', id, text, run };
}
```

```js
// test/fixtures/todo-system.js
import { system } from '../../src/index.js';

const todoSystem = system('todo-service', (spec) => {
  spec
    .why('Help teams track work reliably.')
    .requirement('capture-task', 'The system records a task title.')
    .constraint('require-title', 'A task title cannot be empty.')
    .successCriterion('save-task', 'A valid task can be saved and retrieved.')
    .verification(
      'title-check',
      'Reject empty task titles.',
      async () => ({ ok: true })
    );
});

export default todoSystem;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- test/api/authoring-api.test.js`
Expected: PASS

- [ ] **Step 5: Commit the first authoring slice**

```bash
git add src/index.js src/api/system.js src/api/clauses.js src/api/checks.js test/fixtures/todo-system.js test/api/authoring-api.test.js
git commit -m "feat: add initial spec-like authoring api"
```

## Task 3: Add normalization with stable clause IDs and canonical ordering

**Files:**
- Create: `src/model/normalize.js`
- Create: `src/model/ids.js`
- Create: `src/model/schema.js`
- Create: `test/model/normalize.test.js`
- Modify: `src/index.js`
- Test: `test/model/normalize.test.js`

- [ ] **Step 1: Write the failing normalization tests**

```js
import { describe, expect, it } from 'vitest';
import todoSystem from '../fixtures/todo-system.js';
import { normalizeIntent } from '../../src/index.js';

describe('normalizeIntent', () => {
  it('produces a canonical model with stable clause ids', () => {
    const model = normalizeIntent(todoSystem);

    expect(model.kind).toBe('intent-model');
    expect(model.system.name).toBe('todo-service');
    expect(model.clauses.map((clause) => clause.id)).toEqual([
      'constraint:require-title',
      'requirement:capture-task',
      'success-criterion:save-task',
      'verification:title-check'
    ]);
  });

  it('keeps authored order out of the canonical clause list', () => {
    const model = normalizeIntent(todoSystem);
    const ids = model.clauses.map((clause) => clause.id);

    expect(ids).toEqual([...ids].sort());
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- test/model/normalize.test.js`
Expected: FAIL with `normalizeIntent` not exported

- [ ] **Step 3: Write the minimal normalization code**

```js
// src/model/ids.js
export function createClauseId(kind, localId) {
  return `${kind}:${localId}`;
}
```

```js
// src/model/schema.js
export function createIntentModel(system, clauses) {
  return {
    kind: 'intent-model',
    system,
    clauses
  };
}
```

```js
// src/model/normalize.js
import { createClauseId } from './ids.js';
import { createIntentModel } from './schema.js';

export function normalizeIntent(authoredSystem) {
  const clauses = [...authoredSystem.clauses]
    .map((clause) => ({
      ...clause,
      id: createClauseId(clause.kind, clause.id)
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  return createIntentModel(
    {
      name: authoredSystem.name,
      why: authoredSystem.why
    },
    clauses
  );
}
```

```js
// src/index.js
export { system } from './api/system.js';
export { normalizeIntent } from './model/normalize.js';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- test/model/normalize.test.js`
Expected: PASS

- [ ] **Step 5: Commit the normalization slice**

```bash
git add src/index.js src/model/normalize.js src/model/ids.js src/model/schema.js test/model/normalize.test.js
git commit -m "feat: normalize authored intent into canonical model"
```

## Task 4: Capture source locations and clause metadata for intent-aware debugging

**Files:**
- Create: `src/model/source-location.js`
- Modify: `src/api/system.js`
- Modify: `src/model/normalize.js`
- Create: `test/contracts/debug-metadata.test.js`
- Test: `test/contracts/debug-metadata.test.js`

- [ ] **Step 1: Write the failing debug metadata tests**

```js
import { describe, expect, it } from 'vitest';
import todoSystem from '../fixtures/todo-system.js';
import { normalizeIntent } from '../../src/index.js';

describe('intent-aware debug metadata', () => {
  it('adds source locations and local clause ids to normalized clauses', () => {
    const model = normalizeIntent(todoSystem, {
      sourceFile: 'test/fixtures/todo-system.js'
    });

    expect(model.clauses[0].localId).toBeTruthy();
    expect(model.clauses[0].source.file).toBe('test/fixtures/todo-system.js');
    expect(model.clauses[0].source.kind).toBe('authored-module');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- test/contracts/debug-metadata.test.js`
Expected: FAIL because normalized clauses do not expose `localId` or `source`

- [ ] **Step 3: Write the minimal source metadata implementation**

```js
// src/model/source-location.js
export function createSourceLocation(file, clauseIndex) {
  return {
    kind: 'authored-module',
    file,
    clauseIndex
  };
}
```

```js
// src/api/system.js
export function system(name, definition) {
  const state = {
    kind: 'system',
    name,
    why: '',
    clauses: [],
    nextClauseIndex: 0
  };

  const pushClause = (clause) => {
    state.clauses.push({
      ...clause,
      meta: {
        authoredIndex: state.nextClauseIndex++
      }
    });
    return builder;
  };

  const builder = {
    why(reason) {
      state.why = reason;
      return builder;
    },
    requirement(id, text) {
      return pushClause({ kind: 'requirement', id, text });
    },
    constraint(id, text) {
      return pushClause({ kind: 'constraint', id, text });
    },
    successCriterion(id, text) {
      return pushClause({ kind: 'success-criterion', id, text });
    },
    verification(id, text, run) {
      return pushClause({ kind: 'verification', id, text, run });
    }
  };

  definition(builder);
  return Object.freeze({
    ...state,
    clauses: Object.freeze([...state.clauses])
  });
}
```

```js
// src/model/normalize.js
import { createClauseId } from './ids.js';
import { createSourceLocation } from './source-location.js';
import { createIntentModel } from './schema.js';

export function normalizeIntent(authoredSystem, options = {}) {
  const sourceFile = options.sourceFile ?? '<unknown>';
  const clauses = [...authoredSystem.clauses]
    .map((clause) => ({
      ...clause,
      localId: clause.id,
      id: createClauseId(clause.kind, clause.id),
      source: createSourceLocation(sourceFile, clause.meta.authoredIndex)
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  return createIntentModel(
    {
      name: authoredSystem.name,
      why: authoredSystem.why
    },
    clauses
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- test/contracts/debug-metadata.test.js`
Expected: PASS

- [ ] **Step 5: Commit the debug metadata slice**

```bash
git add src/api/system.js src/model/source-location.js src/model/normalize.js test/contracts/debug-metadata.test.js
git commit -m "feat: add source metadata for intent-aware debugging"
```

## Task 5: Add normalization errors and authoring validation

**Files:**
- Create: `src/errors/axiom-error.js`
- Create: `src/errors/normalization-error.js`
- Modify: `src/model/normalize.js`
- Modify: `test/model/normalize.test.js`
- Test: `test/model/normalize.test.js`

- [ ] **Step 1: Write the failing validation tests**

```js
import { describe, expect, it } from 'vitest';
import { system, normalizeIntent } from '../../src/index.js';

describe('normalizeIntent validation', () => {
  it('fails when a clause id is reused', () => {
    const authored = system('duplicate-ids', (spec) => {
      spec.requirement('same-id', 'First');
      spec.constraint('same-id', 'Second');
    });

    expect(() => normalizeIntent(authored)).toThrowError(
      /Duplicate clause local id: same-id/
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- test/model/normalize.test.js`
Expected: FAIL because duplicate ids are currently accepted

- [ ] **Step 3: Write the minimal error and validation code**

```js
// src/errors/axiom-error.js
export class AxiomError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'AxiomError';
    this.details = details;
  }
}
```

```js
// src/errors/normalization-error.js
import { AxiomError } from './axiom-error.js';

export class NormalizationError extends AxiomError {
  constructor(message, details = {}) {
    super(message, details);
    this.name = 'NormalizationError';
  }
}
```

```js
// src/model/normalize.js
import { NormalizationError } from '../errors/normalization-error.js';
import { createClauseId } from './ids.js';
import { createSourceLocation } from './source-location.js';
import { createIntentModel } from './schema.js';

function assertUniqueLocalIds(clauses) {
  const seen = new Set();

  for (const clause of clauses) {
    if (seen.has(clause.id)) {
      throw new NormalizationError(`Duplicate clause local id: ${clause.id}`, {
        clauseId: clause.id
      });
    }
    seen.add(clause.id);
  }
}

export function normalizeIntent(authoredSystem, options = {}) {
  const sourceFile = options.sourceFile ?? '<unknown>';
  assertUniqueLocalIds(authoredSystem.clauses);

  const clauses = [...authoredSystem.clauses]
    .map((clause) => ({
      ...clause,
      localId: clause.id,
      id: createClauseId(clause.kind, clause.id),
      source: createSourceLocation(sourceFile, clause.meta.authoredIndex)
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  return createIntentModel(
    {
      name: authoredSystem.name,
      why: authoredSystem.why
    },
    clauses
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- test/model/normalize.test.js`
Expected: PASS

- [ ] **Step 5: Commit the validation slice**

```bash
git add src/errors/axiom-error.js src/errors/normalization-error.js src/model/normalize.js test/model/normalize.test.js
git commit -m "feat: validate authored clauses during normalization"
```

## Task 6: Define verification and diagnostics contracts

**Files:**
- Create: `src/contracts/verification.js`
- Create: `src/contracts/diagnostics.js`
- Create: `test/model/traceability.test.js`
- Modify: `src/model/schema.js`
- Modify: `src/index.js`
- Test: `test/model/traceability.test.js`

- [ ] **Step 1: Write the failing traceability and contract tests**

```js
import { describe, expect, it } from 'vitest';
import todoSystem from '../fixtures/todo-system.js';
import { normalizeIntent } from '../../src/index.js';

describe('traceability contracts', () => {
  it('creates coverage mappings and clause status records for verification clauses', () => {
    const model = normalizeIntent(todoSystem, {
      sourceFile: 'test/fixtures/todo-system.js'
    });

    expect(model.coverageMappings).toEqual([
      {
        clauseId: 'verification:title-check',
        checkId: 'verification:title-check'
      }
    ]);
    expect(model.clauseStatuses[0]).toEqual({
      clauseId: 'constraint:require-title',
      status: 'uncovered',
      severity: 'warning'
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- test/model/traceability.test.js`
Expected: FAIL because the normalized model does not include coverage or status data

- [ ] **Step 3: Write the minimal contracts and schema changes**

```js
// src/contracts/verification.js
export function createCoverageMapping(clauseId, checkId) {
  return { clauseId, checkId };
}

export function createClauseStatus(clauseId, status, severity = 'info') {
  return { clauseId, status, severity };
}
```

```js
// src/contracts/diagnostics.js
export function createDiagnostic(code, message, clauseId, severity = 'info') {
  return { code, message, clauseId, severity };
}
```

```js
// src/model/schema.js
export function createIntentModel(system, clauses, extras = {}) {
  return {
    kind: 'intent-model',
    system,
    clauses,
    coverageMappings: extras.coverageMappings ?? [],
    clauseStatuses: extras.clauseStatuses ?? [],
    diagnostics: extras.diagnostics ?? []
  };
}
```

```js
// src/index.js
export { system } from './api/system.js';
export { normalizeIntent } from './model/normalize.js';
export { createCoverageMapping, createClauseStatus } from './contracts/verification.js';
export { createDiagnostic } from './contracts/diagnostics.js';
```

```js
// src/model/normalize.js
import { createClauseStatus, createCoverageMapping } from '../contracts/verification.js';
import { createDiagnostic } from '../contracts/diagnostics.js';
import { NormalizationError } from '../errors/normalization-error.js';
import { createClauseId } from './ids.js';
import { createSourceLocation } from './source-location.js';
import { createIntentModel } from './schema.js';

function assertUniqueLocalIds(clauses) {
  const seen = new Set();

  for (const clause of clauses) {
    if (seen.has(clause.id)) {
      throw new NormalizationError(`Duplicate clause local id: ${clause.id}`, {
        clauseId: clause.id
      });
    }
    seen.add(clause.id);
  }
}

export function normalizeIntent(authoredSystem, options = {}) {
  const sourceFile = options.sourceFile ?? '<unknown>';
  assertUniqueLocalIds(authoredSystem.clauses);

  const clauses = [...authoredSystem.clauses]
    .map((clause) => ({
      ...clause,
      localId: clause.id,
      id: createClauseId(clause.kind, clause.id),
      source: createSourceLocation(sourceFile, clause.meta.authoredIndex)
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  const coverageMappings = clauses
    .filter((clause) => clause.kind === 'verification')
    .map((clause) => createCoverageMapping(clause.id, clause.id));

  const clauseStatuses = clauses
    .filter((clause) => clause.kind !== 'verification')
    .map((clause) => createClauseStatus(clause.id, 'uncovered', 'warning'));

  const diagnostics = clauseStatuses.map((status) =>
    createDiagnostic(
      'proof-gap.uncovered-clause',
      `Clause ${status.clauseId} has no mapped verification yet.`,
      status.clauseId,
      status.severity
    )
  );

  return createIntentModel(
    {
      name: authoredSystem.name,
      why: authoredSystem.why
    },
    clauses,
    {
      coverageMappings,
      clauseStatuses,
      diagnostics
    }
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- test/model/traceability.test.js`
Expected: PASS

- [ ] **Step 5: Commit the contract slice**

```bash
git add src/contracts/verification.js src/contracts/diagnostics.js src/model/schema.js src/model/normalize.js src/index.js test/model/traceability.test.js
git commit -m "feat: define verification and diagnostics contracts"
```

## Task 7: Run the full suite and tighten fixture-based regression coverage

**Files:**
- Modify: `test/api/authoring-api.test.js`
- Modify: `test/model/normalize.test.js`
- Modify: `test/model/traceability.test.js`
- Modify: `test/contracts/debug-metadata.test.js`
- Test: `npm test`

- [ ] **Step 1: Add one regression assertion per spec-critical behavior**

```js
// add to test/api/authoring-api.test.js
expect(Object.isFrozen(todoSystem.clauses)).toBe(true);
```

```js
// add to test/model/normalize.test.js
expect(model.system.why).toBe('Help teams track work reliably.');
```

```js
// add to test/model/traceability.test.js
expect(model.diagnostics[0].code).toBe('proof-gap.uncovered-clause');
```

```js
// add to test/contracts/debug-metadata.test.js
expect(model.clauses[0].source.clauseIndex).toBeTypeOf('number');
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS with all `test/**/*.test.js` files green

- [ ] **Step 3: Commit the regression coverage pass**

```bash
git add test/api/authoring-api.test.js test/model/normalize.test.js test/model/traceability.test.js test/contracts/debug-metadata.test.js
git commit -m "test: add regression coverage for core intent model behaviors"
```

## Spec Coverage Check

- Authoring API: covered by Tasks 2 and 7
- Intent Model normalization: covered by Tasks 3 and 5
- Stable clause identities and traceability: covered by Tasks 3, 4, and 6
- Diagnostics and verification-facing contracts: covered by Task 6
- Intent-aware debugging metadata: covered by Task 4
- Error classification and normalization failures: covered by Task 5
- Fixture-based, readable examples: covered by Tasks 2 and 7

## Self-Review Notes

- Placeholder scan: complete; every task includes concrete files, code, commands, and commit steps.
- Type consistency: `clause.id` is the local authored ID before normalization, `localId` retains that value afterward, and `id` becomes the canonical `ClauseId`.
- Scope check: the plan stays inside the approved V1 boundary by defining contracts for verification and diagnostics without building a full runtime or editor integration.
