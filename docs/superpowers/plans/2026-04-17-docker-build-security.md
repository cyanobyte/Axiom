# Docker Build Runner Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `security.build.mode: "docker"` execute the full `ax build` inside a Docker runner while preserving local builds and failing VM runner requests clearly.

**Architecture:** The host CLI inspects the intent definition and runtime config, creates a plain runner plan, and launches Docker with read-only source plus writable generated/report mounts. The inner `ax build --inside-runner` uses the normal runtime path with runner-specific workspace and artifact root overrides so the existing adapters write inside mounted runner directories. VM mode remains validated but returns `UNSUPPORTED_BUILD_RUNNER` before executing authored workflow code.

**Tech Stack:** Node.js ESM, Vitest, Docker CLI via `child_process.spawn`, existing Axiom security normalization and runtime adapters.

---

## File Map

- Create `src/security/create-build-runner-plan.js`: convert normalized build security plus runtime config into the internal runner contract.
- Create `src/security/create-docker-build-runner.js`: build and execute deterministic `docker run` arguments through an injectable process runner.
- Modify `src/adapters/create-configured-adapters.js`: honor runner-only root overrides from an injected environment object.
- Modify `src/adapters/create-local-artifact-adapter.js`: allow absolute artifact roots for mounted runner report directories.
- Modify `src/public/run-intent-file.js`: pass an injected environment into adapter creation.
- Modify `src/cli/build-command.js`: parse `--inside-runner`, bootstrap Docker/VM runner behavior, and pass environment through inner builds.
- Modify `bin/ax.js`: wire the real loader/config/security/runner dependencies into `buildCommand`.
- Create `test/security/create-build-runner-plan.test.js`: cover runner contract generation, path resolution, and env allowlisting.
- Create `test/security/create-docker-build-runner.test.js`: cover Docker args, output streaming, exit code return, and start failure wrapping.
- Create `test/adapters/create-configured-adapters-runner-overrides.test.js`: cover runner root overrides and absolute artifact root support.
- Modify `test/public/run-intent-file.test.js`: cover `runIntentFile` passing environment into configured adapters through behavior.
- Modify `test/cli/build-command.test.js`: cover docker host launch, inside-runner guard, nested-runner prevention, and VM unsupported failure.
- Modify `docs/superpowers/specs/2026-04-17-docker-build-security-design.md`: append implementation notes if the code reveals a necessary contract clarification.

## Task 1: Runner Path Override Plumbing

**Files:**
- Modify: `src/adapters/create-configured-adapters.js`
- Modify: `src/adapters/create-local-artifact-adapter.js`
- Modify: `src/public/run-intent-file.js`
- Create: `test/adapters/create-configured-adapters-runner-overrides.test.js`

- [x] **Step 1: Write failing adapter override tests**

Add `test/adapters/create-configured-adapters-runner-overrides.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { createConfiguredAdapters } from '../../src/adapters/create-configured-adapters.js';

const runtimeConfig = {
  workspace: { root: './host/generated' },
  artifacts: { root: '../host-reports' },
  agents: {},
  workers: { shell: { type: 'fake-shell' } }
};

describe('createConfiguredAdapters runner overrides', () => {
  it('uses runner workspace and artifact roots only when AXIOM_RUNNER is set', async () => {
    const adapters = createConfiguredAdapters({
      runtimeConfig,
      environment: {
        AXIOM_RUNNER: '1',
        AXIOM_WORKSPACE_ROOT: '/workspace/generated',
        AXIOM_ARTIFACTS_ROOT: '/workspace/reports'
      }
    });

    expect(adapters.workspace.root()).toBe('/workspace/generated');
    expect(adapters.artifacts.root()).toBe('/workspace/reports');
  });

  it('ignores runner root variables outside runner mode', async () => {
    const adapters = createConfiguredAdapters({
      runtimeConfig,
      environment: {
        AXIOM_WORKSPACE_ROOT: '/workspace/generated',
        AXIOM_ARTIFACTS_ROOT: '/workspace/reports'
      }
    });

    expect(adapters.workspace.root()).toBe('./host/generated');
    expect(adapters.artifacts.root()).toContain('host/generated');
  });
});
```

- [x] **Step 2: Run tests to verify failure**

Run: `npx vitest run test/adapters/create-configured-adapters-runner-overrides.test.js`

Expected: FAIL because `environment` is ignored and `artifacts.root()` does not exist yet.

- [x] **Step 3: Implement artifact adapter root reporting and absolute root handling**

In `src/adapters/create-local-artifact-adapter.js`, replace `const resolvedRoot = ...` and return object with:

```js
  const resolvedRoot = path.isAbsolute(artifactRoot)
    ? artifactRoot
    : path.join(workspaceRoot, artifactRoot);
  const artifactDirectoryName = path.basename(path.normalize(resolvedRoot));

  return {
    root() {
      return resolvedRoot;
    },
    async read(relativePath) {
      const normalizedPath = relativePath.startsWith(`${artifactDirectoryName}/`)
        ? relativePath.slice(artifactDirectoryName.length + 1)
        : relativePath;
      const content = await fs.readFile(path.join(resolvedRoot, normalizedPath), 'utf8');
      return JSON.parse(content);
    }
  };
```

- [x] **Step 4: Implement configured adapter runner overrides**

In `src/adapters/create-configured-adapters.js`, change the function signature and root selection:

```js
export function createConfiguredAdapters({ runtimeConfig, environment = process.env }) {
  const insideRunner = environment.AXIOM_RUNNER === '1';
  const workspaceRoot =
    insideRunner && environment.AXIOM_WORKSPACE_ROOT
      ? environment.AXIOM_WORKSPACE_ROOT
      : runtimeConfig.workspace.root;
  const artifactRoot =
    insideRunner && environment.AXIOM_ARTIFACTS_ROOT
      ? environment.AXIOM_ARTIFACTS_ROOT
      : runtimeConfig.artifacts.root;

  const workspace = createLocalWorkspaceAdapter(workspaceRoot);
  const artifacts = createLocalArtifactAdapter(workspaceRoot, artifactRoot);
```

Keep the remaining provider and worker logic unchanged.

- [x] **Step 5: Pass environment through runIntentFile**

In `src/public/run-intent-file.js`, change adapter creation to:

```js
  const adapters = createConfiguredAdapters({
    intentFilePath: resolvedPath,
    runtimeConfig,
    environment: options.environment ?? process.env
  });
```

- [x] **Step 6: Run focused tests**

Run: `npx vitest run test/adapters/create-configured-adapters-runner-overrides.test.js test/public/run-intent-file.test.js`

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add src/adapters/create-configured-adapters.js src/adapters/create-local-artifact-adapter.js src/public/run-intent-file.js test/adapters/create-configured-adapters-runner-overrides.test.js
git commit -m "feat: support runner path overrides"
```

## Task 2: Build Runner Plan Contract

**Files:**
- Create: `src/security/create-build-runner-plan.js`
- Create: `test/security/create-build-runner-plan.test.js`

- [x] **Step 1: Write failing plan contract tests**

Add `test/security/create-build-runner-plan.test.js`:

```js
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createBuildRunnerPlan } from '../../src/security/create-build-runner-plan.js';

describe('createBuildRunnerPlan', () => {
  it('creates a Docker runner contract with resolved mounts and allowlisted env', () => {
    const projectRoot = path.resolve('/repo');
    const plan = createBuildRunnerPlan({
      intentPath: '/repo/examples/basic/counter-webapp.axiom.js',
      runtimeConfigPath: '/repo/examples/basic/axiom.config.js',
      runtimeConfig: {
        workspace: { root: './examples/basic/generated' },
        artifacts: { root: '../reports' }
      },
      buildSecurity: {
        mode: 'docker',
        profile: 'node-webapp',
        image: 'ghcr.io/science451/axiom-build-node-webapp:latest',
        network: 'restricted',
        env: { allow: ['PATH', 'HOME', 'NODE_ENV', 'MISSING_ENV'] },
        resources: { cpu: 2, memory: '4g' },
        tools: ['node', 'npm']
      },
      environment: {
        PATH: '/usr/bin',
        HOME: '/home/user',
        NODE_ENV: 'development'
      },
      projectRoot
    });

    expect(plan).toEqual({
      kind: 'docker-build-runner-plan',
      intentPath: 'examples/basic/counter-webapp.axiom.js',
      projectRoot,
      runtimeConfigPath: '/repo/examples/basic/axiom.config.js',
      workspaceRoot: '/repo/examples/basic/generated',
      artifactsRoot: '/repo/examples/basic/reports',
      buildSecurity: {
        mode: 'docker',
        profile: 'node-webapp',
        image: 'ghcr.io/science451/axiom-build-node-webapp:latest',
        network: 'restricted',
        env: { allow: ['PATH', 'HOME', 'NODE_ENV', 'MISSING_ENV'] },
        resources: { cpu: 2, memory: '4g' },
        tools: ['node', 'npm']
      },
      env: {
        AXIOM_RUNNER: '1',
        AXIOM_RUNNER_KIND: 'docker',
        AXIOM_WORKSPACE_ROOT: '/workspace/generated',
        AXIOM_ARTIFACTS_ROOT: '/workspace/reports',
        PATH: '/usr/bin',
        HOME: '/home/user',
        NODE_ENV: 'development'
      }
    });
  });

  it('rejects non-Docker build security', () => {
    expect(() =>
      createBuildRunnerPlan({
        intentPath: '/repo/app.axiom.js',
        runtimeConfigPath: '/repo/axiom.config.js',
        runtimeConfig: {
          workspace: { root: './generated' },
          artifacts: { root: './reports' }
        },
        buildSecurity: { mode: 'local' },
        environment: {},
        projectRoot: '/repo'
      })
    ).toThrow('createBuildRunnerPlan requires docker build security.');
  });
});
```

- [x] **Step 2: Run tests to verify failure**

Run: `npx vitest run test/security/create-build-runner-plan.test.js`

Expected: FAIL because the module does not exist.

- [x] **Step 3: Implement plan creation**

Create `src/security/create-build-runner-plan.js`:

```js
import path from 'node:path';

const RUNNER_WORKSPACE_ROOT = '/workspace/generated';
const RUNNER_ARTIFACTS_ROOT = '/workspace/reports';

export function createBuildRunnerPlan({
  intentPath,
  runtimeConfigPath,
  runtimeConfig,
  buildSecurity,
  environment = process.env,
  projectRoot = process.cwd()
}) {
  if (buildSecurity?.mode !== 'docker') {
    throw new Error('createBuildRunnerPlan requires docker build security.');
  }

  const resolvedProjectRoot = path.resolve(projectRoot);
  const resolvedIntentPath = path.resolve(intentPath);
  const resolvedRuntimeConfigPath = path.resolve(runtimeConfigPath);
  const workspaceRoot = resolveFromProjectRoot(resolvedProjectRoot, runtimeConfig.workspace.root);
  const artifactsRoot = path.isAbsolute(runtimeConfig.artifacts.root)
    ? runtimeConfig.artifacts.root
    : path.resolve(workspaceRoot, runtimeConfig.artifacts.root);

  return {
    kind: 'docker-build-runner-plan',
    intentPath: toPortableRelativePath(resolvedProjectRoot, resolvedIntentPath),
    projectRoot: resolvedProjectRoot,
    runtimeConfigPath: resolvedRuntimeConfigPath,
    workspaceRoot,
    artifactsRoot,
    buildSecurity,
    env: {
      AXIOM_RUNNER: '1',
      AXIOM_RUNNER_KIND: 'docker',
      AXIOM_WORKSPACE_ROOT: RUNNER_WORKSPACE_ROOT,
      AXIOM_ARTIFACTS_ROOT: RUNNER_ARTIFACTS_ROOT,
      ...pickAllowedEnvironment(buildSecurity.env?.allow ?? [], environment)
    }
  };
}

function resolveFromProjectRoot(projectRoot, configuredPath) {
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(projectRoot, configuredPath);
}

function pickAllowedEnvironment(allowedNames, environment) {
  return Object.fromEntries(
    allowedNames
      .filter((name) => environment[name] !== undefined)
      .map((name) => [name, environment[name]])
  );
}

function toPortableRelativePath(root, target) {
  return path.relative(root, target).split(path.sep).join('/');
}
```

- [x] **Step 4: Run focused tests**

Run: `npx vitest run test/security/create-build-runner-plan.test.js`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/security/create-build-runner-plan.js test/security/create-build-runner-plan.test.js
git commit -m "feat: create docker build runner plan"
```

## Task 3: Docker Runner Launcher

**Files:**
- Create: `src/security/create-docker-build-runner.js`
- Create: `test/security/create-docker-build-runner.test.js`

- [x] **Step 1: Write failing Docker launcher tests**

Add `test/security/create-docker-build-runner.test.js`:

```js
import { describe, expect, it, vi } from 'vitest';
import { createDockerBuildRunner } from '../../src/security/create-docker-build-runner.js';

const plan = {
  kind: 'docker-build-runner-plan',
  intentPath: 'examples/basic/counter-webapp.axiom.js',
  projectRoot: '/repo',
  workspaceRoot: '/repo/examples/basic/generated',
  artifactsRoot: '/repo/examples/basic/reports',
  buildSecurity: {
    mode: 'docker',
    image: 'ghcr.io/science451/axiom-build-node-webapp:latest',
    network: 'restricted',
    resources: { cpu: 2, memory: '4g' }
  },
  env: {
    AXIOM_RUNNER: '1',
    AXIOM_RUNNER_KIND: 'docker',
    AXIOM_WORKSPACE_ROOT: '/workspace/generated',
    AXIOM_ARTIFACTS_ROOT: '/workspace/reports',
    NODE_ENV: 'development'
  }
};

describe('createDockerBuildRunner', () => {
  it('runs docker with source, workspace, artifact mounts and runner env', async () => {
    const processRunner = vi.fn(async () => ({ exitCode: 7 }));
    const runner = createDockerBuildRunner({ processRunner });

    const result = await runner.run(plan, { signal: 'signal-value' });

    expect(result).toEqual({ exitCode: 7 });
    expect(processRunner).toHaveBeenCalledWith(
      'docker',
      [
        'run',
        '--rm',
        '--network',
        'none',
        '--cpus',
        '2',
        '--memory',
        '4g',
        '-e',
        'AXIOM_RUNNER=1',
        '-e',
        'AXIOM_RUNNER_KIND=docker',
        '-e',
        'AXIOM_WORKSPACE_ROOT=/workspace/generated',
        '-e',
        'AXIOM_ARTIFACTS_ROOT=/workspace/reports',
        '-e',
        'NODE_ENV=development',
        '-v',
        '/repo:/workspace/source:ro',
        '-v',
        '/repo/examples/basic/generated:/workspace/generated',
        '-v',
        '/repo/examples/basic/reports:/workspace/reports',
        '-w',
        '/workspace/source',
        'ghcr.io/science451/axiom-build-node-webapp:latest',
        'ax',
        'build',
        'examples/basic/counter-webapp.axiom.js',
        '--inside-runner'
      ],
      { cwd: '/repo', signal: 'signal-value', onOutput: undefined }
    );
  });

  it('wraps process start errors with a Docker runner code', async () => {
    const processRunner = vi.fn(async () => {
      throw new Error('spawn docker ENOENT');
    });
    const runner = createDockerBuildRunner({ processRunner });

    await expect(runner.run(plan)).rejects.toMatchObject({
      code: 'DOCKER_BUILD_RUNNER_START_FAILED',
      message: 'Docker build runner could not start: spawn docker ENOENT'
    });
  });
});
```

- [x] **Step 2: Run tests to verify failure**

Run: `npx vitest run test/security/create-docker-build-runner.test.js`

Expected: FAIL because the module does not exist.

- [x] **Step 3: Implement Docker argument generation and spawn runner**

Create `src/security/create-docker-build-runner.js`:

```js
import { spawn } from 'node:child_process';

export function createDockerBuildRunner({ processRunner = spawnProcess } = {}) {
  return {
    async run(plan, { signal, onOutput } = {}) {
      try {
        return await processRunner('docker', createDockerArgs(plan), {
          cwd: plan.projectRoot,
          signal,
          onOutput
        });
      } catch (error) {
        const wrapped = new Error(`Docker build runner could not start: ${error.message}`);
        wrapped.code = 'DOCKER_BUILD_RUNNER_START_FAILED';
        throw wrapped;
      }
    }
  };
}

function createDockerArgs(plan) {
  return [
    'run',
    '--rm',
    '--network',
    plan.buildSecurity.network === 'restricted' ? 'none' : String(plan.buildSecurity.network),
    '--cpus',
    String(plan.buildSecurity.resources.cpu),
    '--memory',
    plan.buildSecurity.resources.memory,
    ...Object.entries(plan.env).flatMap(([name, value]) => ['-e', `${name}=${value}`]),
    '-v',
    `${plan.projectRoot}:/workspace/source:ro`,
    '-v',
    `${plan.workspaceRoot}:/workspace/generated`,
    '-v',
    `${plan.artifactsRoot}:/workspace/reports`,
    '-w',
    '/workspace/source',
    plan.buildSecurity.image,
    'ax',
    'build',
    plan.intentPath,
    '--inside-runner'
  ];
}

function spawnProcess(command, args, { cwd, signal, onOutput } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      signal,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    child.stdout.on('data', (chunk) => onOutput?.({ stream: 'stdout', chunk: String(chunk) }));
    child.stderr.on('data', (chunk) => onOutput?.({ stream: 'stderr', chunk: String(chunk) }));
    child.on('error', reject);
    child.on('close', (exitCode) => resolve({ exitCode }));
  });
}
```

- [x] **Step 4: Run focused tests**

Run: `npx vitest run test/security/create-docker-build-runner.test.js`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/security/create-docker-build-runner.js test/security/create-docker-build-runner.test.js
git commit -m "feat: add docker build runner launcher"
```

## Task 4: CLI Build Bootstrap

**Files:**
- Modify: `src/cli/build-command.js`
- Modify: `bin/ax.js`
- Modify: `test/cli/build-command.test.js`

- [x] **Step 1: Add failing CLI bootstrap tests**

First add this helper at the bottom of `test/cli/build-command.test.js`:

```js
function localBuildInspection() {
  return {
    loadIntentFile: vi.fn(async () => ({ definition: {} })),
    loadRuntimeConfig: vi.fn(async () => ({
      workspace: { root: './generated' },
      artifacts: { root: './reports' }
    })),
    validateRuntimeConfig: vi.fn((config) => config)
  };
}
```

Update each existing test that expects `runIntentFile` to execute a fake local build by spreading the helper into the dependency object:

```js
    const exitCode = await buildCommand(
      ['examples/basic/counter-webapp.axiom.js'],
      { runIntentFile, logger, ...localBuildInspection() }
    );
```

For existing tests that verify target resolution failures before a file is found, leave the dependency object unchanged because build inspection never runs.

Then append these cases to `test/cli/build-command.test.js`:

```js
  it('launches Docker runner on the host and skips local runtime execution', async () => {
    const loadIntentFile = vi.fn(async () => ({
      definition: {
        security: {
          build: {
            mode: 'docker',
            profile: 'node-webapp',
            image: 'image',
            network: 'restricted',
            env: { allow: [] },
            resources: { cpu: 2, memory: '4g' },
            tools: ['node', 'npm']
          }
        }
      }
    }));
    const loadRuntimeConfig = vi.fn(async () => ({
      workspace: { root: './generated' },
      artifacts: { root: './reports' }
    }));
    const validateRuntimeConfig = vi.fn((config) => config);
    const createBuildRunnerPlan = vi.fn(() => ({ kind: 'docker-build-runner-plan' }));
    const dockerBuildRunner = { run: vi.fn(async () => ({ exitCode: 23 })) };
    const createDockerBuildRunner = vi.fn(() => dockerBuildRunner);
    const runIntentFile = vi.fn();
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await buildCommand(['app.axiom.js'], {
      runIntentFile,
      logger,
      loadIntentFile,
      loadRuntimeConfig,
      validateRuntimeConfig,
      createBuildRunnerPlan,
      createDockerBuildRunner,
      environment: {}
    });

    expect(exitCode).toBe(23);
    expect(runIntentFile).not.toHaveBeenCalled();
    expect(createBuildRunnerPlan).toHaveBeenCalledWith(expect.objectContaining({
      intentPath: 'app.axiom.js',
      runtimeConfig: {
        workspace: { root: './generated' },
        artifacts: { root: './reports' }
      }
    }));
    expect(dockerBuildRunner.run).toHaveBeenCalledWith(
      { kind: 'docker-build-runner-plan' },
      expect.objectContaining({ signal: expect.any(AbortSignal), onOutput: expect.any(Function) })
    );
  });

  it('runs local runtime inside a valid runner environment', async () => {
    const runIntentFile = vi.fn(async () => ({ status: 'passed', events: [] }));
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await buildCommand(['app.axiom.js', '--inside-runner'], {
      runIntentFile,
      logger,
      environment: { AXIOM_RUNNER: '1' }
    });

    expect(exitCode).toBe(0);
    expect(runIntentFile).toHaveBeenCalledWith(
      'app.axiom.js',
      expect.objectContaining({
        environment: { AXIOM_RUNNER: '1' }
      })
    );
  });

  it('rejects inside-runner flag without runner environment marker', async () => {
    const runIntentFile = vi.fn();
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await buildCommand(['app.axiom.js', '--inside-runner'], {
      runIntentFile,
      logger,
      environment: {}
    });

    expect(exitCode).toBe(1);
    expect(runIntentFile).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('--inside-runner requires AXIOM_RUNNER=1.');
  });

  it('does not launch a nested runner when AXIOM_RUNNER is already set', async () => {
    const runIntentFile = vi.fn(async () => ({ status: 'passed', events: [] }));
    const createDockerBuildRunner = vi.fn();
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await buildCommand(['app.axiom.js'], {
      runIntentFile,
      logger,
      createDockerBuildRunner,
      environment: { AXIOM_RUNNER: '1' }
    });

    expect(exitCode).toBe(0);
    expect(createDockerBuildRunner).not.toHaveBeenCalled();
    expect(runIntentFile).toHaveBeenCalled();
  });

  it('fails VM build mode before executing authored workflow', async () => {
    const loadIntentFile = vi.fn(async () => ({
      definition: {
        security: {
          build: {
            mode: 'vm',
            provider: 'virtualbox',
            profile: 'node-webapp'
          }
        }
      }
    }));
    const loadRuntimeConfig = vi.fn(async () => ({
      workspace: { root: './generated' },
      artifacts: { root: './reports' }
    }));
    const validateRuntimeConfig = vi.fn((config) => config);
    const runIntentFile = vi.fn();
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await buildCommand(['app.axiom.js'], {
      runIntentFile,
      logger,
      loadIntentFile,
      loadRuntimeConfig,
      validateRuntimeConfig,
      environment: {}
    });

    expect(exitCode).toBe(1);
    expect(runIntentFile).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      '[error:UNSUPPORTED_BUILD_RUNNER] security.build.mode "vm" is validated but VM build runners are not implemented yet.'
    );
  });
```

- [x] **Step 2: Run tests to verify failure**

Run: `npx vitest run test/cli/build-command.test.js`

Expected: FAIL because `buildCommand` lacks the runner bootstrap dependencies and flag handling.

- [x] **Step 3: Add dependencies and flag parsing to buildCommand**

In `src/cli/build-command.js`, add imports:

```js
import { loadIntentFile as loadIntentFileDefault } from '../public/load-intent-file.js';
import { loadRuntimeConfig as loadRuntimeConfigDefault } from '../public/load-runtime-config.js';
import { validateRuntimeConfig as validateRuntimeConfigDefault } from '../config/validate-runtime-config.js';
import { createBuildRunnerPlan as createBuildRunnerPlanDefault } from '../security/create-build-runner-plan.js';
import { createDockerBuildRunner as createDockerBuildRunnerDefault } from '../security/create-docker-build-runner.js';
```

Change the dependency destructuring and argument parsing:

```js
    signalHandlers = defaultSignalHandlers,
    loadIntentFile = loadIntentFileDefault,
    loadRuntimeConfig = loadRuntimeConfigDefault,
    validateRuntimeConfig = validateRuntimeConfigDefault,
    createBuildRunnerPlan = createBuildRunnerPlanDefault,
    createDockerBuildRunner = createDockerBuildRunnerDefault,
    environment = process.env,
    projectRoot = process.cwd()
```

```js
  const verbose = args.includes('--verbose');
  const insideRunner = args.includes('--inside-runner');
  let filePath = args.find((arg) => !['--verbose', '--inside-runner'].includes(arg));
```

- [x] **Step 4: Add runner bootstrap before executeBuild**

In `src/cli/build-command.js`, before `return executeBuild(...)`, add:

```js
  if (insideRunner && environment.AXIOM_RUNNER !== '1') {
    logger.error('--inside-runner requires AXIOM_RUNNER=1.');
    return 1;
  }

  if (!insideRunner && environment.AXIOM_RUNNER !== '1') {
    const runnerExitCode = await maybeExecuteBuildRunner(filePath, {
      logger,
      loadIntentFile,
      loadRuntimeConfig,
      validateRuntimeConfig,
      createBuildRunnerPlan,
      createDockerBuildRunner,
      environment,
      projectRoot,
      signalHandlers
    });

    if (runnerExitCode !== undefined) {
      return runnerExitCode;
    }
  }

  return executeBuild(filePath, { verbose, runIntentFile, logger, signalHandlers, environment });
```

Update `executeBuild` to pass `environment`:

```js
    const result = await runIntentFile(filePath, {
      signal: controller.signal,
      environment,
      onEvent(event) {
```

- [x] **Step 5: Add maybeExecuteBuildRunner helper**

Add this helper below `executeBuild`:

```js
async function maybeExecuteBuildRunner(
  filePath,
  {
    logger,
    loadIntentFile,
    loadRuntimeConfig,
    validateRuntimeConfig,
    createBuildRunnerPlan,
    createDockerBuildRunner,
    environment,
    projectRoot,
    signalHandlers
  }
) {
  let file;
  let runtimeConfig;

  try {
    file = await loadIntentFile(path.resolve(filePath));
    runtimeConfig = validateRuntimeConfig(await loadRuntimeConfig(path.resolve(filePath)));
  } catch (error) {
    logger.error(error.message);
    return 1;
  }

  const buildSecurity = file.definition.security?.build;
  if (!buildSecurity || buildSecurity.mode === 'local') {
    return undefined;
  }

  if (buildSecurity.mode === 'vm') {
    logger.error(
      '[error:UNSUPPORTED_BUILD_RUNNER] security.build.mode "vm" is validated but VM build runners are not implemented yet.'
    );
    return 1;
  }

  if (buildSecurity.mode !== 'docker') {
    return undefined;
  }

  const controller = new AbortController();
  const handleInterrupt = () => controller.abort();
  signalHandlers.register(handleInterrupt);

  try {
    const runnerPlan = createBuildRunnerPlan({
      intentPath: filePath,
      runtimeConfigPath: path.join(path.dirname(path.resolve(filePath)), 'axiom.config.js'),
      runtimeConfig,
      buildSecurity,
      environment,
      projectRoot
    });
    const dockerBuildRunner = createDockerBuildRunner();
    const result = await dockerBuildRunner.run(runnerPlan, {
      signal: controller.signal,
      onOutput(event) {
        logger[event.stream === 'stderr' ? 'error' : 'log'](event.chunk.trimEnd());
      }
    });

    return result.exitCode ?? 1;
  } catch (error) {
    if (error.code === 'ABORT_ERR' || controller.signal.aborted) {
      return 130;
    }

    logger.error(error.message);
    return 1;
  } finally {
    signalHandlers.unregister(handleInterrupt);
  }
}
```

- [x] **Step 6: Wire real dependencies in bin/ax.js**

In `bin/ax.js`, import these modules:

```js
import { loadIntentFile } from '../src/public/load-intent-file.js';
import { loadRuntimeConfig } from '../src/public/load-runtime-config.js';
import { validateRuntimeConfig } from '../src/config/validate-runtime-config.js';
import { createBuildRunnerPlan } from '../src/security/create-build-runner-plan.js';
import { createDockerBuildRunner } from '../src/security/create-docker-build-runner.js';
```

Change the build command call to:

```js
    exitCode = await buildCommand(args.slice(1), {
      runIntentFile,
      logger: console,
      loadIntentFile,
      loadRuntimeConfig,
      validateRuntimeConfig,
      createBuildRunnerPlan,
      createDockerBuildRunner
    });
```

- [x] **Step 7: Run CLI tests**

Run: `npx vitest run test/cli/build-command.test.js`

Expected: PASS.

- [x] **Step 8: Commit**

```bash
git add src/cli/build-command.js bin/ax.js test/cli/build-command.test.js
git commit -m "feat: launch docker build runner from cli"
```

## Task 5: End-to-End Runner Mode Regression

**Files:**
- Modify: `test/public/run-intent-file.test.js`

- [x] **Step 1: Add runner environment regression test**

Append this test to `test/public/run-intent-file.test.js`. It uses the imports and `createFixtureIntent` helper already present in that file.

```js
  it('writes generated files to runner override roots inside AXIOM_RUNNER mode', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'axiom-runner-'));
    const generatedRoot = path.join(root, 'runner-generated');
    const reportsRoot = path.join(root, 'runner-reports');
    const intentPath = path.join(root, 'app.axiom.js');
    const configPath = path.join(root, 'axiom.config.js');
    const runtimeModuleUrl = pathToFileURL(path.resolve('src/index.js')).href;

    await fs.writeFile(
      configPath,
      `export default {
  agents: {
    briefing: { provider: "fake", responses: { briefing: { ok: true } } }
  },
  workspace: { root: ${JSON.stringify(path.join(root, 'host-generated'))} },
  workers: { shell: { type: "fake-shell" } },
  artifacts: { root: "./reports" }
};
`,
      'utf8'
    );

    await fs.writeFile(
      intentPath,
      createFixtureIntent({
        runtimeModuleUrl,
        version: '1.0.0',
        outputFile: 'app.txt',
        outputText: 'runner file'
      }),
      'utf8'
    );

    const result = await runIntentFile(intentPath, {
      environment: {
        AXIOM_RUNNER: '1',
        AXIOM_WORKSPACE_ROOT: generatedRoot,
        AXIOM_ARTIFACTS_ROOT: reportsRoot
      }
    });

    expect(result.status).toBe('passed');
    await expect(fs.readFile(path.join(generatedRoot, 'app.txt'), 'utf8')).resolves.toBe('runner file');
    await expect(fs.access(path.join(root, 'host-generated'))).rejects.toThrow();
  });
```

- [x] **Step 2: Run test to verify behavior**

Run: `npx vitest run test/public/run-intent-file.test.js`

Expected: PASS.

- [x] **Step 3: Commit**

```bash
git add test/public/run-intent-file.test.js
git commit -m "test: cover runner mode file execution roots"
```

## Task 6: Full Verification And Documentation Note

**Files:**
- Modify if needed: `docs/superpowers/specs/2026-04-17-docker-build-security-design.md`

- [x] **Step 1: Run full test suite**

Run: `npm test`

Expected: all non-skipped tests pass.

- [x] **Step 2: Run a non-Docker local smoke build**

Run: `node bin/ax.js build examples/basic/counter-webapp.axiom.js`

Expected: exits `0` and prints a passed build result. This confirms local mode and normal build behavior still work after the CLI bootstrap change.

- [x] **Step 3: Run deterministic Docker-mode CLI unit coverage**

Run: `npx vitest run test/cli/build-command.test.js test/security/create-build-runner-plan.test.js test/security/create-docker-build-runner.test.js`

Expected: PASS. This is the deterministic substitute for a live Docker pull/run because the runner image is not built by this feature.

- [x] **Step 4: Update design notes only if implementation narrowed the contract**

If the implementation changed the approved contract, append this section to `docs/superpowers/specs/2026-04-17-docker-build-security-design.md`:

```md
## Implementation Notes

- Runtime config paths are resolved from the process project root for the first Docker runner implementation, matching current CLI execution behavior.
- Live Docker image pull and image build are outside this slice; deterministic coverage uses an injected process runner.
```

If the implementation matches the spec without narrowing it, leave the spec unchanged.

- [x] **Step 5: Commit verification docs if changed**

If the spec was modified:

```bash
git add docs/superpowers/specs/2026-04-17-docker-build-security-design.md
git commit -m "docs: record docker runner implementation notes"
```

If the spec was not modified, do not create a documentation-only commit.

## Self-Review Checklist

- Spec coverage: Docker host launch, `--inside-runner` guard, no recursive runner launch, env allowlist, runner root mounts, local behavior preservation, VM unsupported failure, deterministic fake process tests, and no Docker image build are all mapped to tasks above.
- Placeholder scan: The plan contains concrete commands, file paths, snippets, and expected outcomes for every task.
- Type consistency: `createBuildRunnerPlan`, `createDockerBuildRunner`, `environment`, `AXIOM_WORKSPACE_ROOT`, `AXIOM_ARTIFACTS_ROOT`, and `--inside-runner` names are consistent across tests, implementation snippets, and CLI wiring.

## Final Verification Before Merge

Run these commands before merging or pushing the completed implementation:

```bash
npm test
node bin/ax.js build examples/basic/counter-webapp.axiom.js
git status --short
```

Expected:

```text
all Vitest tests pass
local smoke build exits 0
git status shows only intentional committed changes or a clean worktree
```
