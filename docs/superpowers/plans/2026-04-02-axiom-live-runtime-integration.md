# Axiom Live Runtime Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current tested runtime skeleton into a usable MVP by loading sibling `axiom.config.js` files, constructing real adapters from config, exposing a runnable CLI, and supporting one live model provider path plus local shell/workspace/artifact execution.

**Architecture:** `axiom run <file.axiom.js>` should load the intent file, load `axiom.config.js` from the same directory by default, validate both, build adapters from that config, run preflight readiness checks, execute the workflow, and return structured results. The intent file remains provider-agnostic; all provider, shell, workspace, and artifact wiring lives in config and adapter factories.

**Tech Stack:** Node.js, JavaScript (ES modules), Vitest

---

## Testing Strategy

The standard automated suite must remain low-token and deterministic.

- `unit tests`
  No live provider calls; validate config loading, config validation, adapter factory selection, and CLI argument handling.
- `runtime integration tests`
  Use fake providers and local temp directories to verify `runIntentFile(...)`, local workspace access, local artifact reads, and shell execution plumbing.
- `example execution tests`
  Run `examples/basic/counter-webapp.axiom.js` through `runIntentFile(...)` with a sibling config and deterministic adapters.
- `manual live smoke test`
  One documented manual path using a real provider, not part of default CI.

The default `npm test` path must not call live AI services.

---

## File Structure

### Public API and CLI

- Modify: `src/index.js`
- Create: `src/public/load-runtime-config.js`
- Create: `src/public/build-adapters.js`
- Create: `src/public/run-intent-file.js`
- Create: `src/cli/run-command.js`
- Create: `bin/axiom.js`
- Modify: `package.json`

### Config Validation

- Create: `src/config/validate-runtime-config.js`
- Create: `src/config/provider-capabilities.js`

### Adapter Factories

- Create: `src/adapters/create-local-workspace-adapter.js`
- Create: `src/adapters/create-local-artifact-adapter.js`
- Create: `src/adapters/create-local-shell-adapter.js`
- Create: `src/adapters/create-configured-adapters.js`
- Create: `src/adapters/providers/create-openai-agent-adapter.js`
- Create: `src/adapters/providers/create-fake-agent-adapter.js`

### Tests

- Create: `test/public/load-runtime-config.test.js`
- Create: `test/config/validate-runtime-config.test.js`
- Create: `test/public/run-intent-file.test.js`
- Create: `test/adapters/create-configured-adapters.test.js`
- Create: `test/cli/run-command.test.js`
- Create: `test/examples/counter-webapp-file-runtime.test.js`

---

## Task 1: Load sibling `axiom.config.js` files

**Files:**
- Create: `src/public/load-runtime-config.js`
- Create: `test/public/load-runtime-config.test.js`
- Test: `test/public/load-runtime-config.test.js`

- [ ] **Step 1: Write the failing config loader tests**

```js
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { loadRuntimeConfig } from '../../src/public/load-runtime-config.js';

describe('loadRuntimeConfig', () => {
  it('loads axiom.config.js from the same directory as the intent file', async () => {
    const config = await loadRuntimeConfig(path.resolve('examples/basic/counter-webapp.axiom.js'));
    expect(config.agents.planner.provider).toBe('codex');
    expect(config.artifacts.root).toBe('./reports');
  });

  it('throws a clear error when the sibling config file is missing', async () => {
    await expect(
      loadRuntimeConfig(path.resolve('docs/superpowers/examples/todo-app.axiom.js'))
    ).rejects.toThrow('Missing runtime config: axiom.config.js');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/public/load-runtime-config.test.js`
Expected: FAIL with missing module `src/public/load-runtime-config.js`

- [ ] **Step 3: Implement the minimal config loader**

```js
// src/public/load-runtime-config.js
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function loadRuntimeConfig(intentFilePath) {
  const directory = path.dirname(path.resolve(intentFilePath));
  const configPath = path.join(directory, 'axiom.config.js');

  try {
    const module = await import(pathToFileURL(configPath).href);
    return module.default;
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' || String(error.message).includes(configPath)) {
      throw new Error('Missing runtime config: axiom.config.js');
    }
    throw error;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- test/public/load-runtime-config.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/public/load-runtime-config.js test/public/load-runtime-config.test.js
git commit -m "feat: load sibling runtime config files"
```

## Task 2: Validate runtime config shape

**Files:**
- Create: `src/config/validate-runtime-config.js`
- Create: `test/config/validate-runtime-config.test.js`
- Test: `test/config/validate-runtime-config.test.js`

- [ ] **Step 1: Write the failing config validation tests**

```js
import { describe, expect, it } from 'vitest';
import { validateRuntimeConfig } from '../../src/config/validate-runtime-config.js';

describe('validateRuntimeConfig', () => {
  it('accepts a config with agents, workers, and artifacts', () => {
    const config = validateRuntimeConfig({
      agents: {
        planner: { provider: 'fake', model: 'planner-model' }
      },
      workers: {
        shell: { type: 'local-shell' }
      },
      artifacts: {
        root: './reports'
      }
    });

    expect(config.artifacts.root).toBe('./reports');
  });

  it('rejects configs without any agent mappings', () => {
    expect(() => validateRuntimeConfig({
      workers: { shell: { type: 'local-shell' } },
      artifacts: { root: './reports' }
    })).toThrow('Runtime config must define at least one agent');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/config/validate-runtime-config.test.js`
Expected: FAIL with missing module `src/config/validate-runtime-config.js`

- [ ] **Step 3: Implement minimal validation**

```js
// src/config/validate-runtime-config.js
export function validateRuntimeConfig(config) {
  if (!config?.agents || Object.keys(config.agents).length === 0) {
    throw new Error('Runtime config must define at least one agent');
  }

  if (!config?.workers?.shell) {
    throw new Error('Runtime config must define workers.shell');
  }

  if (!config?.artifacts?.root) {
    throw new Error('Runtime config must define artifacts.root');
  }

  return config;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- test/config/validate-runtime-config.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/config/validate-runtime-config.js test/config/validate-runtime-config.test.js
git commit -m "feat: validate runtime config files"
```

## Task 3: Build local workspace, artifact, and shell adapters

**Files:**
- Create: `src/adapters/create-local-workspace-adapter.js`
- Create: `src/adapters/create-local-artifact-adapter.js`
- Create: `src/adapters/create-local-shell-adapter.js`
- Create: `test/adapters/create-configured-adapters.test.js`
- Test: `test/adapters/create-configured-adapters.test.js`

- [ ] **Step 1: Write the failing local adapter tests**

```js
import { describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createLocalWorkspaceAdapter } from '../../src/adapters/create-local-workspace-adapter.js';
import { createLocalArtifactAdapter } from '../../src/adapters/create-local-artifact-adapter.js';

describe('local adapters', () => {
  it('reads files from the configured workspace and artifact roots', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'axiom-local-'));
    await fs.mkdir(path.join(root, 'reports'));
    await fs.writeFile(path.join(root, 'reports', 'sample.json'), JSON.stringify({ ok: true }));

    const workspace = createLocalWorkspaceAdapter(root);
    const artifacts = createLocalArtifactAdapter(root, './reports');

    expect(workspace.root()).toBe(root);
    expect(await artifacts.read('sample.json')).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/adapters/create-configured-adapters.test.js`
Expected: FAIL with missing local adapter modules

- [ ] **Step 3: Implement minimal local adapters**

```js
// src/adapters/create-local-workspace-adapter.js
import path from 'node:path';
import fs from 'node:fs/promises';

export function createLocalWorkspaceAdapter(rootPath) {
  return {
    root() {
      return rootPath;
    },
    async read(filePath) {
      return fs.readFile(path.join(rootPath, filePath), 'utf8');
    },
    async write(filePath, content) {
      await fs.writeFile(path.join(rootPath, filePath), content, 'utf8');
    },
    async patch() {
      throw new Error('Workspace patching not implemented yet');
    }
  };
}
```

```js
// src/adapters/create-local-artifact-adapter.js
import path from 'node:path';
import fs from 'node:fs/promises';

export function createLocalArtifactAdapter(workspaceRoot, artifactRoot) {
  const resolvedRoot = path.join(workspaceRoot, artifactRoot);

  return {
    async read(relativePath) {
      const content = await fs.readFile(path.join(resolvedRoot, relativePath), 'utf8');
      return JSON.parse(content);
    }
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- test/adapters/create-configured-adapters.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/adapters/create-local-workspace-adapter.js src/adapters/create-local-artifact-adapter.js test/adapters/create-configured-adapters.test.js
git commit -m "feat: add local workspace and artifact adapters"
```

## Task 4: Add provider-backed agent adapter factories

**Files:**
- Create: `src/adapters/providers/create-fake-agent-adapter.js`
- Create: `src/adapters/providers/create-openai-agent-adapter.js`
- Create: `src/adapters/create-configured-adapters.js`
- Modify: `src/index.js`
- Test: `test/adapters/create-configured-adapters.test.js`

- [ ] **Step 1: Extend the adapter factory test with provider mapping**

```js
it('maps capability names to configured agent providers', async () => {
  const adapters = createConfiguredAdapters({
    intentFilePath: 'examples/basic/counter-webapp.axiom.js',
    runtimeConfig: {
      agents: {
        planner: { provider: 'fake', responses: { planner: { ok: true } } }
      },
      workers: { shell: { type: 'local-shell' } },
      artifacts: { root: './reports' },
      workspace: { root: process.cwd() }
    }
  });

  const planner = adapters.ai.agent('planner');
  expect(await planner.run({ value: 1 })).toEqual({ ok: true });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/adapters/create-configured-adapters.test.js`
Expected: FAIL because `createConfiguredAdapters` does not exist

- [ ] **Step 3: Implement provider-backed factories**

```js
// src/adapters/providers/create-fake-agent-adapter.js
export function createFakeAgentAdapter(agentName, config = {}) {
  return {
    async run(input) {
      if (config.responses?.[agentName] !== undefined) {
        return config.responses[agentName];
      }
      return input;
    }
  };
}
```

```js
// src/adapters/providers/create-openai-agent-adapter.js
export function createOpenAIAgentAdapter(agentName, config = {}) {
  return {
    async run(input) {
      throw new Error(`Live provider not yet configured for ${agentName}: ${config.model ?? 'unknown-model'}`);
    }
  };
}
```

```js
// src/adapters/create-configured-adapters.js
import { createFakeAgentAdapter } from './providers/create-fake-agent-adapter.js';
import { createOpenAIAgentAdapter } from './providers/create-openai-agent-adapter.js';
import { createLocalWorkspaceAdapter } from './create-local-workspace-adapter.js';
import { createLocalArtifactAdapter } from './create-local-artifact-adapter.js';

export function createConfiguredAdapters({ runtimeConfig }) {
  const workspace = createLocalWorkspaceAdapter(runtimeConfig.workspace.root);
  const artifacts = createLocalArtifactAdapter(runtimeConfig.workspace.root, runtimeConfig.artifacts.root);

  return {
    workspace,
    artifacts,
    ai: {
      agent(name) {
        const config = runtimeConfig.agents[name];
        if (!config) {
          throw new Error(`Missing agent config for capability: ${name}`);
        }

        if (config.provider === 'fake') {
          return createFakeAgentAdapter(name, config);
        }

        if (config.provider === 'codex' || config.provider === 'openai') {
          return createOpenAIAgentAdapter(name, config);
        }

        throw new Error(`Unsupported provider: ${config.provider}`);
      }
    },
    workers: {
      worker() {
        return {
          async exec(spec) {
            return { ...spec, exitCode: 0 };
          }
        };
      }
    },
    checkpoint: {
      async approval() { return { accepted: true }; },
      async choice() { return { value: null }; },
      async input() { return { value: null }; }
    }
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- test/adapters/create-configured-adapters.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/adapters/providers/create-fake-agent-adapter.js src/adapters/providers/create-openai-agent-adapter.js src/adapters/create-configured-adapters.js src/index.js test/adapters/create-configured-adapters.test.js
git commit -m "feat: build adapters from runtime config"
```

## Task 5: Add `runIntentFile(...)` with automatic config loading

**Files:**
- Create: `src/public/run-intent-file.js`
- Modify: `src/index.js`
- Create: `test/public/run-intent-file.test.js`
- Test: `test/public/run-intent-file.test.js`

- [ ] **Step 1: Write the failing file-runtime test**

```js
import { describe, expect, it } from 'vitest';
import { runIntentFile } from '../../src/index.js';

describe('runIntentFile', () => {
  it('loads the intent file, loads sibling config, and runs the workflow', async () => {
    const result = await runIntentFile('examples/basic/counter-webapp.axiom.js');

    expect(result.status).toBe('passed');
    expect(result.stepResults.map((step) => step.stepId)).toEqual([
      'brief',
      'plan',
      'implement',
      'test'
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/public/run-intent-file.test.js`
Expected: FAIL with missing export `runIntentFile`

- [ ] **Step 3: Implement the file runtime entrypoint**

```js
// src/public/run-intent-file.js
import path from 'node:path';
import { loadIntentFile } from './load-intent-file.js';
import { loadRuntimeConfig } from './load-runtime-config.js';
import { validateRuntimeConfig } from '../config/validate-runtime-config.js';
import { createConfiguredAdapters } from '../adapters/create-configured-adapters.js';
import { runIntent } from '../runtime/run-intent.js';

export async function runIntentFile(intentFilePath) {
  const resolvedPath = path.resolve(intentFilePath);
  const file = await loadIntentFile(resolvedPath);
  const runtimeConfig = validateRuntimeConfig(await loadRuntimeConfig(resolvedPath));
  const adapters = createConfiguredAdapters({
    intentFilePath: resolvedPath,
    runtimeConfig
  });

  return runIntent(file, adapters);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- test/public/run-intent-file.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/public/run-intent-file.js src/index.js src/config/validate-runtime-config.js test/public/run-intent-file.test.js
git commit -m "feat: run intent files with sibling config"
```

## Task 6: Add a minimal CLI

**Files:**
- Create: `src/cli/run-command.js`
- Create: `bin/axiom.js`
- Modify: `package.json`
- Create: `test/cli/run-command.test.js`
- Test: `test/cli/run-command.test.js`

- [ ] **Step 1: Write the failing CLI test**

```js
import { describe, expect, it, vi } from 'vitest';
import { runCommand } from '../../src/cli/run-command.js';

describe('runCommand', () => {
  it('runs an intent file path provided on the command line', async () => {
    const runIntentFile = vi.fn(async () => ({ status: 'passed' }));
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await runCommand(
      ['examples/basic/counter-webapp.axiom.js'],
      { runIntentFile, logger }
    );

    expect(exitCode).toBe(0);
    expect(runIntentFile).toHaveBeenCalledWith('examples/basic/counter-webapp.axiom.js');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/cli/run-command.test.js`
Expected: FAIL with missing module `src/cli/run-command.js`

- [ ] **Step 3: Implement the minimal CLI**

```js
// src/cli/run-command.js
export async function runCommand(args, { runIntentFile, logger }) {
  const filePath = args[0];
  if (!filePath) {
    logger.error('Usage: axiom run <file.axiom.js>');
    return 1;
  }

  try {
    const result = await runIntentFile(filePath);
    logger.log(JSON.stringify(result, null, 2));
    return result.status === 'passed' ? 0 : 1;
  } catch (error) {
    logger.error(error.message);
    return 1;
  }
}
```

```js
// bin/axiom.js
#!/usr/bin/env node
import { runCommand } from '../src/cli/run-command.js';
import { runIntentFile } from '../src/public/run-intent-file.js';

const args = process.argv.slice(2);
if (args[0] === 'run') {
  const exitCode = await runCommand(args.slice(1), { runIntentFile, logger: console });
  process.exit(exitCode);
}

console.error('Usage: axiom run <file.axiom.js>');
process.exit(1);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- test/cli/run-command.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli/run-command.js bin/axiom.js package.json test/cli/run-command.test.js
git commit -m "feat: add axiom run cli"
```

## Task 7: Make the beginner example runnable through `runIntentFile(...)`

**Files:**
- Create: `test/examples/counter-webapp-file-runtime.test.js`
- Test: `test/examples/counter-webapp-file-runtime.test.js`

- [ ] **Step 1: Write the failing file-runtime example test**

```js
import { describe, expect, it } from 'vitest';
import { runIntentFile } from '../../src/index.js';

describe('basic counter example via file runtime', () => {
  it('runs through sibling runtime config', async () => {
    const result = await runIntentFile('examples/basic/counter-webapp.axiom.js');

    expect(result.status).toBe('passed');
    expect(result.finalValue.app).toBe('counter-webapp');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/examples/counter-webapp-file-runtime.test.js`
Expected: FAIL because `runIntentFile(...)` or configured adapters are incomplete

- [ ] **Step 3: Wire the example config for deterministic local execution**

Update `examples/basic/axiom.config.js` so it can run under default test conditions:

```js
export default {
  agents: {
    briefing: { provider: 'fake', responses: { briefing: { kind: 'brief', summary: 'counter' } } },
    planner: {
      provider: 'fake',
      responses: {
        planner: {
          includesLoadCounter: true,
          includesIncrementCounter: true,
          includesResetCounter: true,
          usesExpress: true,
          usesInMemoryState: true,
          returnsJsonCount: true,
          servesSinglePage: true
        }
      }
    },
    coder: { provider: 'fake', responses: { coder: { generated: true } } }
  },
  workspace: {
    root: './examples/basic'
  },
  workers: {
    shell: { type: 'local-shell' }
  },
  artifacts: {
    root: './reports'
  }
};
```

Also create `examples/basic/reports/counter-ui.json`:

```json
{
  "loads": true,
  "increments": true,
  "resets": true,
  "apiReturnsJsonCount": true
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- test/examples/counter-webapp-file-runtime.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add examples/basic/axiom.config.js examples/basic/reports/counter-ui.json test/examples/counter-webapp-file-runtime.test.js
git commit -m "test: run beginner example through file runtime"
```

## Task 8: Full-suite verification and live smoke-test documentation

**Files:**
- Modify: `README.md`
- Test: `npm test`

- [ ] **Step 1: Document the runnable MVP path**

Add to `README.md`:

```md
## Running Axiom

Install dependencies:

```bash
npm install
```

Run the beginner example:

```bash
node bin/axiom.js run examples/basic/counter-webapp.axiom.js
```

This loads:

- `examples/basic/counter-webapp.axiom.js`
- `examples/basic/axiom.config.js`
```

- [ ] **Step 2: Run the full suite**

Run: `npm test`
Expected: PASS with all tests green

- [ ] **Step 3: Manual live smoke-test note**

Document one manual command in `README.md` for later provider wiring:

```md
When a live provider adapter is implemented, replace the fake agent entries in `examples/basic/axiom.config.js` with provider-backed entries and rerun the same CLI command.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document runnable file-based runtime flow"
```

## Task 9: Replace the shell stub with real local process execution

**Files:**
- Modify: `src/adapters/create-local-shell-adapter.js`
- Create: `test/adapters/create-local-shell-adapter.test.js`
- Test: `test/adapters/create-local-shell-adapter.test.js`

- [ ] **Step 1: Write the failing shell adapter tests**

```js
import { describe, expect, it } from 'vitest';
import { createLocalShellAdapter } from '../../src/adapters/create-local-shell-adapter.js';

describe('createLocalShellAdapter', () => {
  it('executes a local command and returns stdout, stderr, and exitCode', async () => {
    const shell = createLocalShellAdapter();
    const result = await shell.exec({
      command: 'node -e "console.log(123)"',
      cwd: process.cwd()
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('123');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/adapters/create-local-shell-adapter.test.js`
Expected: FAIL because the current shell adapter returns a stub result with no real stdout

- [ ] **Step 3: Implement real local process execution**

```js
// src/adapters/create-local-shell-adapter.js
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export function createLocalShellAdapter() {
  return {
    async exec(spec) {
      try {
        const { stdout, stderr } = await execAsync(spec.command, {
          cwd: spec.cwd
        });

        return {
          ...spec,
          stdout,
          stderr,
          exitCode: 0
        };
      } catch (error) {
        return {
          ...spec,
          stdout: error.stdout ?? '',
          stderr: error.stderr ?? '',
          exitCode: error.code ?? 1
        };
      }
    }
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- test/adapters/create-local-shell-adapter.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/adapters/create-local-shell-adapter.js test/adapters/create-local-shell-adapter.test.js
git commit -m "feat: execute local shell commands"
```

## Task 10: Add a real provider-backed agent path

**Files:**
- Modify: `src/adapters/providers/create-openai-agent-adapter.js`
- Create: `test/adapters/create-openai-agent-adapter.test.js`
- Create: `examples/basic/axiom.live.config.js`
- Test: `test/adapters/create-openai-agent-adapter.test.js`

- [ ] **Step 1: Write the failing live-provider adapter tests**

```js
import { describe, expect, it } from 'vitest';
import { createOpenAIAgentAdapter } from '../../src/adapters/providers/create-openai-agent-adapter.js';

describe('createOpenAIAgentAdapter', () => {
  it('requires an api key and model for live provider execution', async () => {
    const adapter = createOpenAIAgentAdapter('planner', {});

    await expect(adapter.run({ intent: { id: 'x' } })).rejects.toThrow(
      'Missing OpenAI API key for planner'
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/adapters/create-openai-agent-adapter.test.js`
Expected: FAIL because the current placeholder error message does not validate config

- [ ] **Step 3: Implement the minimal live-provider request path**

```js
// src/adapters/providers/create-openai-agent-adapter.js
export function createOpenAIAgentAdapter(agentName, config = {}) {
  return {
    async run(input) {
      if (!config.apiKey) {
        throw new Error(`Missing OpenAI API key for ${agentName}`);
      }

      if (!config.model) {
        throw new Error(`Missing OpenAI model for ${agentName}`);
      }

      throw new Error(`Live provider call not implemented yet for ${agentName}: ${config.model}`);
    }
  };
}
```

Add a documented live config example:

```js
// examples/basic/axiom.live.config.js
export default {
  agents: {
    briefing: { provider: 'openai', model: 'gpt-5.4', apiKey: process.env.OPENAI_API_KEY },
    planner: { provider: 'openai', model: 'gpt-5.4', apiKey: process.env.OPENAI_API_KEY },
    coder: { provider: 'openai', model: 'gpt-5.4-codex', apiKey: process.env.OPENAI_API_KEY }
  },
  workspace: {
    root: './examples/basic'
  },
  workers: {
    shell: { type: 'local-shell' }
  },
  artifacts: {
    root: './reports'
  }
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- test/adapters/create-openai-agent-adapter.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/adapters/providers/create-openai-agent-adapter.js test/adapters/create-openai-agent-adapter.test.js examples/basic/axiom.live.config.js
git commit -m "feat: validate live provider configuration"
```

## Task 11: Document the manual live smoke path

**Files:**
- Modify: `README.md`
- Modify: `examples/basic/README.md`
- Test: `npm test`

- [ ] **Step 1: Document the live smoke command**

Add to `README.md`:

```md
## Live Smoke Path

When a real provider adapter is wired, copy or adapt `examples/basic/axiom.live.config.js`
to `examples/basic/axiom.config.js`, set `OPENAI_API_KEY`, and run:

```bash
node bin/axiom.js run examples/basic/counter-webapp.axiom.js
```

This path is manual-only and should not be part of the default automated suite.
```

- [ ] **Step 2: Re-run the full suite**

Run: `npm test`
Expected: PASS with all tests green

- [ ] **Step 3: Commit**

```bash
git add README.md examples/basic/README.md
git commit -m "docs: add live smoke path documentation"
```

## Task 12: Implement real live provider execution

**Files:**
- Modify: `src/adapters/providers/create-openai-agent-adapter.js`
- Create: `test/adapters/create-openai-agent-adapter.integration.test.js`
- Modify: `README.md`
- Test: `test/adapters/create-openai-agent-adapter.integration.test.js`

- [ ] **Step 1: Write the failing live execution test behind an env guard**

```js
import { describe, expect, it } from 'vitest';
import { createOpenAIAgentAdapter } from '../../src/adapters/providers/create-openai-agent-adapter.js';

const hasLiveConfig = Boolean(process.env.OPENAI_API_KEY);

describe('createOpenAIAgentAdapter live execution', () => {
  it.skipIf(!hasLiveConfig)('calls the live provider and returns text output', async () => {
    const adapter = createOpenAIAgentAdapter('planner', {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-5.4'
    });

    const result = await adapter.run({
      prompt: 'Return exactly the word READY.'
    });

    expect(typeof result).toBe('string');
    expect(result).toContain('READY');
  });
});
```

- [ ] **Step 2: Run the test to verify it is skipped without config and fails once enabled**

Run: `npm test -- test/adapters/create-openai-agent-adapter.integration.test.js`
Expected: SKIP when `OPENAI_API_KEY` is absent

Manual check:

```bash
OPENAI_API_KEY=... npm test -- test/adapters/create-openai-agent-adapter.integration.test.js
```

Expected: FAIL because live request execution is not implemented yet

- [ ] **Step 3: Implement the real provider call**

```js
// src/adapters/providers/create-openai-agent-adapter.js
export function createOpenAIAgentAdapter(agentName, config = {}) {
  return {
    async run(input) {
      if (!config.apiKey) {
        throw new Error(`Missing OpenAI API key for ${agentName}`);
      }

      if (!config.model) {
        throw new Error(`Missing OpenAI model for ${agentName}`);
      }

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          input: typeof input === 'string' ? input : JSON.stringify(input, null, 2)
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI request failed for ${agentName}: ${response.status}`);
      }

      const data = await response.json();
      return data.output_text ?? '';
    }
  };
}
```

- [ ] **Step 4: Run the automated suite and the manual live smoke test**

Run: `npm test`
Expected: PASS with the integration test skipped by default

Manual smoke:

```bash
cp examples/basic/axiom.live.config.js examples/basic/axiom.config.js
OPENAI_API_KEY=... node bin/axiom.js run examples/basic/counter-webapp.axiom.js
```

Expected:
- runtime starts successfully
- live adapter is invoked
- the run reaches real planning/coding calls instead of throwing "not implemented yet"

- [ ] **Step 5: Commit**

```bash
git add src/adapters/providers/create-openai-agent-adapter.js test/adapters/create-openai-agent-adapter.integration.test.js README.md
git commit -m "feat: execute live provider requests"
```

## Task 13: Prove the MVP is fully functional end to end

**Files:**
- Modify: `README.md`
- Modify: `examples/basic/README.md`
- Create: `docs/superpowers/specs/axiom-mvp-acceptance.md`
- Test: `npm test`

- [ ] **Step 1: Write explicit MVP acceptance criteria**

Create `docs/superpowers/specs/axiom-mvp-acceptance.md`:

```md
# Axiom MVP Acceptance

The MVP is considered fully functional only when all of the following are true:

1. `node bin/axiom.js run <file.axiom.js>` works.
2. The runtime loads sibling `axiom.config.js` automatically.
3. The runtime builds adapters from config successfully.
4. The runtime can call a real provider for at least one configured agent capability.
5. The runtime can execute a real local shell command.
6. The runtime can read artifact files from disk.
7. The runtime can execute verification and return structured results.
8. The beginner example can be run through the CLI with a live provider config.
9. The default automated suite still passes without calling live AI.
```

- [ ] **Step 2: Run the default suite**

Run: `npm test`
Expected: PASS with all tests green and live-provider integration tests skipped by default

- [ ] **Step 3: Run the real end-to-end manual smoke**

Manual smoke command:

```bash
cp examples/basic/axiom.live.config.js examples/basic/axiom.config.js
OPENAI_API_KEY=... node bin/axiom.js run examples/basic/counter-webapp.axiom.js
```

Expected:
- the CLI loads the example and sibling config
- the live provider adapter is invoked successfully
- the shell adapter executes the configured test command
- artifact-backed verification executes
- the run finishes with a structured result instead of throwing a provider placeholder error

- [ ] **Step 4: Restore the deterministic example config after the smoke**

```bash
git checkout -- examples/basic/axiom.config.js
```

Expected: the beginner example returns to the deterministic fake-agent config used by the default suite

- [ ] **Step 5: Document the completion state**

Add to `README.md` and `examples/basic/README.md`:

```md
The MVP is fully functional when:
- the automated suite passes without live AI
- the live smoke path succeeds with a real provider configuration
```

- [ ] **Step 6: Commit**

```bash
git add README.md examples/basic/README.md docs/superpowers/specs/axiom-mvp-acceptance.md
git commit -m "docs: define full MVP acceptance criteria"
```

## Spec Coverage Check

- Sibling `axiom.config.js` loading: covered by Tasks 1 and 5
- Config validation: covered by Task 2
- Local workspace/artifact execution: covered by Task 3
- Provider-capability mapping: covered by Task 4
- File-based runtime entrypoint: covered by Task 5
- User-facing CLI: covered by Task 6
- Runnable beginner example: covered by Task 7
- Low-token default testing: preserved across Tasks 1 through 11
- Real local shell execution: covered by Task 9
- Live provider-backed agent path: covered by Task 10
- Manual live smoke documentation: covered by Task 11
- Actual live provider execution: covered by Task 12
- Full MVP acceptance proof: covered by Task 13

## Self-Review Notes

- Placeholder scan: complete; every task includes exact files, tests, commands, and commit points.
- Type consistency: this plan consistently uses `loadRuntimeConfig`, `validateRuntimeConfig`, `createConfiguredAdapters`, `runIntentFile`, and `runCommand`.
- Scope check: this plan now carries the runtime from deterministic local execution through actual live provider requests and an explicit end-to-end acceptance proof. It still does not attempt pause/resume persistence, real patch-based intent revision, or multi-provider production parity.
