# Docker Runner Local Auto-Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the Docker runner image tag to `axiom-build-node-webapp:local` and have `ax build` auto-build the runner image from the repo Dockerfile when it is missing, with full live-streamed Docker build output.

**Architecture:** Two parallel changes land in one plan. First, propagate the new `:local` tag across profile, package scripts, README, and tests. Second, add an `ensure-docker-build-image` module that follows the existing `createDockerBuildRunner` injection pattern, wire it into the CLI's runner bootstrap before the runner launch, and resolve the Dockerfile path from a new fixed-depth Axiom package root helper. All new unit tests inject a fake process runner so Docker is not required to verify correctness.

**Tech Stack:** Node.js ESM, Vitest, Docker CLI, `node:child_process`, `node:fs/promises`, `node:path`, `node:url`.

---

## File Structure

**Files created:**
- `src/runtime/axiom-package-root.js` — fixed-depth helper that returns the Axiom package root.
- `src/security/ensure-docker-build-image.js` — image-ensure factory with injected `processRunner`.
- `test/runtime/axiom-package-root.test.js` — deterministic test for the package-root helper.
- `test/security/ensure-docker-build-image.test.js` — deterministic tests for image inspect and build paths.
- `test/cli/build-command-auto-build.test.js` — wiring tests that the ensurer runs before the runner.

**Files modified:**
- `src/security/build-profiles.js` — new `dockerfile` field and new `:local` image tag.
- `src/cli/build-command.js` — call ensurer before `dockerBuildRunner.run`.
- `package.json` — update `docker:runner:build` and `docker:runner:smoke` tag strings.
- `docker/runner/node-webapp/README.md` — update tag references and document auto-build.
- `README.md` — short note in the security section about auto-build on first use.
- `test/docker/runner-image.test.js` — update tag constant assertions.
- `test/security/create-docker-build-runner.test.js` — update tag constant.
- `test/security/create-build-runner-plan.test.js` — update tag constant and add `dockerfile` flow-through assertion.
- `test/security/normalize-security-policy.test.js` — update tag constant and add `dockerfile` assertion.

---

## Task 1: Tag Rename

**Files:**
- Modify: `src/security/build-profiles.js`
- Modify: `package.json`
- Modify: `docker/runner/node-webapp/README.md`
- Modify: `test/docker/runner-image.test.js`
- Modify: `test/security/create-docker-build-runner.test.js`
- Modify: `test/security/create-build-runner-plan.test.js`
- Modify: `test/security/normalize-security-policy.test.js`

- [ ] **Step 1: Update tag assertion in `test/docker/runner-image.test.js`**

Replace the top-level `imageTag` constant:

```js
const imageTag = 'axiom-build-node-webapp:local';
```

- [ ] **Step 2: Update tag assertions in `test/security/create-docker-build-runner.test.js`**

Replace every occurrence of `ghcr.io/science451/axiom-build-node-webapp:latest` with `axiom-build-node-webapp:local` in both the `plan` fixture (`buildSecurity.image`) and the expected docker args array.

- [ ] **Step 3: Update tag assertion in `test/security/create-build-runner-plan.test.js`**

Replace both occurrences of `ghcr.io/science451/axiom-build-node-webapp:latest` (one in the input `buildSecurity.image`, one in the expected `plan.buildSecurity.image`) with `axiom-build-node-webapp:local`.

- [ ] **Step 4: Update tag assertion in `test/security/normalize-security-policy.test.js`**

Replace the `image` expectation in the `normalizes docker build security with an official profile` test (around line 49) with `axiom-build-node-webapp:local`.

- [ ] **Step 5: Run all four tag tests to verify they FAIL**

Run: `npx vitest run test/docker/runner-image.test.js test/security/create-docker-build-runner.test.js test/security/create-build-runner-plan.test.js test/security/normalize-security-policy.test.js`

Expected: FAIL — the source still uses the old GHCR tag.

- [ ] **Step 6: Update the profile definition in `src/security/build-profiles.js`**

Change the image string:

```js
export const BUILD_PROFILES = {
  'node-webapp': {
    docker: {
      image: 'axiom-build-node-webapp:local',
      network: 'restricted',
      env: { allow: ['PATH', 'HOME', 'NODE_ENV'] },
      resources: { cpu: 2, memory: '4g' },
      tools: ['node', 'npm']
    },
    vm: {
      virtualbox: {
        packerTemplate: 'profiles/node-webapp/virtualbox.pkr.hcl',
        network: 'restricted',
        env: { allow: ['PATH', 'HOME', 'NODE_ENV'] },
        resources: { cpu: 2, memory: '4g' },
        tools: ['node', 'npm']
      }
    }
  }
};
```

(The `dockerfile` field is added in Task 2; this step is image tag only.)

- [ ] **Step 7: Update `package.json` scripts**

Replace both script values:

```json
"docker:runner:build": "docker build -f docker/runner/node-webapp/Dockerfile -t axiom-build-node-webapp:local .",
"docker:runner:smoke": "docker run --rm axiom-build-node-webapp:local sh -lc \"command -v ax\""
```

- [ ] **Step 8: Update `docker/runner/node-webapp/README.md`**

Replace the three image-tag references (the headline code block, the `docker push` example, and any prose) with `axiom-build-node-webapp:local`. Remove the `## Publish` section entirely — the image is intentionally local-only. Add a short paragraph right after the intro explaining that this image is not published anywhere by default; `ax build` builds it on first use from this Dockerfile.

Final README should look like:

```markdown
# Node Web App Runner Image

This image backs the Axiom Docker build profile:

```text
axiom-build-node-webapp:local
```

It provides Node.js, npm, and the `ax` CLI inside the runner container. The host launcher mounts source read-only at `/workspace/source`, generated output at `/workspace/generated`, and reports at `/workspace/reports`.

The image is intentionally local-only and is not published to any registry. `ax build` will build it automatically the first time you run a Docker-backed build; you can also build it manually with the script below.

## Build Locally

```bash
npm run docker:runner:build
```

## Smoke Test

```bash
npm run docker:runner:smoke
```

The smoke command starts the image and verifies that the `ax` command is available on `PATH`.

## Rebuild After Axiom Changes

The auto-build only triggers when the image is missing. After pulling Axiom source updates, force a rebuild with:

```bash
docker image rm axiom-build-node-webapp:local
```

The next `ax build` will rebuild the image from the updated source. Alternatively, run `npm run docker:runner:build` directly.

## Axiom Build Use

Intent files opt into this runner through:

```js
security: {
  build: {
    mode: "docker",
    profile: "node-webapp"
  }
}
```

The host `ax build` command launches this image and runs:

```bash
ax build <intent-file> --inside-runner
```

This is a development runner image. It is not yet a hardened production sandbox: image signing, provenance, SBOMs, and stricter runtime hardening are future work.
```

- [ ] **Step 9: Run all four tag tests to verify they PASS**

Run: `npx vitest run test/docker/runner-image.test.js test/security/create-docker-build-runner.test.js test/security/create-build-runner-plan.test.js test/security/normalize-security-policy.test.js`

Expected: all four test files PASS.

- [ ] **Step 10: Commit**

```bash
git add src/security/build-profiles.js package.json docker/runner/node-webapp/README.md test/docker/runner-image.test.js test/security/create-docker-build-runner.test.js test/security/create-build-runner-plan.test.js test/security/normalize-security-policy.test.js
git commit -m "refactor: rename docker runner image tag to axiom-build-node-webapp:local"
```

---

## Task 2: Axiom Package Root Helper

**Files:**
- Create: `src/runtime/axiom-package-root.js`
- Create: `test/runtime/axiom-package-root.test.js`

- [ ] **Step 1: Write the failing test**

Create `test/runtime/axiom-package-root.test.js`:

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getAxiomPackageRoot } from '../../src/runtime/axiom-package-root.js';

describe('getAxiomPackageRoot', () => {
  it('returns the directory containing package.json with the Axiom name', () => {
    const root = getAxiomPackageRoot();
    const testDir = path.dirname(fileURLToPath(import.meta.url));
    const expectedRoot = path.resolve(testDir, '../..');

    expect(root).toBe(expectedRoot);
  });

  it('returns the same cached value on repeated calls', () => {
    expect(getAxiomPackageRoot()).toBe(getAxiomPackageRoot());
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/runtime/axiom-package-root.test.js`

Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Implement the helper**

Create `src/runtime/axiom-package-root.js`:

```js
/**
 * Purpose: Resolve the Axiom package root from inside Axiom's own source tree.
 * Responsibilities:
 * - Return the absolute path of the directory that contains package.json.
 * - Cache the resolved value for the process lifetime.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let cachedRoot;

export function getAxiomPackageRoot() {
  if (cachedRoot) {
    return cachedRoot;
  }

  const thisFile = fileURLToPath(import.meta.url);
  cachedRoot = path.resolve(path.dirname(thisFile), '../..');
  return cachedRoot;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/runtime/axiom-package-root.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/runtime/axiom-package-root.js test/runtime/axiom-package-root.test.js
git commit -m "feat: add axiom package root helper"
```

---

## Task 3: Profile Carries Dockerfile Path

**Files:**
- Modify: `src/security/build-profiles.js`
- Modify: `test/security/create-build-runner-plan.test.js`
- Modify: `test/security/normalize-security-policy.test.js`

- [ ] **Step 1: Extend `test/security/normalize-security-policy.test.js`**

In the `normalizes docker build security with an official profile` test, extend the assertion to include the `dockerfile` field:

```js
expect(policy.build).toMatchObject({
  mode: 'docker',
  profile: 'node-webapp',
  image: 'axiom-build-node-webapp:local',
  dockerfile: 'docker/runner/node-webapp/Dockerfile',
  network: 'restricted',
  env: { allow: ['PATH', 'HOME', 'NODE_ENV'] }
});
```

- [ ] **Step 2: Extend `test/security/create-build-runner-plan.test.js`**

Add `dockerfile` to both the input `buildSecurity` and the expected `plan.buildSecurity`:

- In the `buildSecurity` input (around line 17):
  ```js
  buildSecurity: {
    mode: 'docker',
    profile: 'node-webapp',
    image: 'axiom-build-node-webapp:local',
    dockerfile: 'docker/runner/node-webapp/Dockerfile',
    network: 'restricted',
    env: { allow: ['PATH', 'HOME', 'NODE_ENV', 'MISSING_ENV'] },
    resources: { cpu: 2, memory: '4g' },
    tools: ['node', 'npm']
  }
  ```
- In the expected `plan.buildSecurity` (around line 39), mirror the same `dockerfile` field.

- [ ] **Step 3: Run the two updated tests to verify they FAIL**

Run: `npx vitest run test/security/normalize-security-policy.test.js test/security/create-build-runner-plan.test.js`

Expected: FAIL — `dockerfile` field not in normalized policy.

- [ ] **Step 4: Add `dockerfile` field to the profile**

Modify `src/security/build-profiles.js` so `BUILD_PROFILES['node-webapp'].docker` includes:

```js
docker: {
  image: 'axiom-build-node-webapp:local',
  dockerfile: 'docker/runner/node-webapp/Dockerfile',
  network: 'restricted',
  env: { allow: ['PATH', 'HOME', 'NODE_ENV'] },
  resources: { cpu: 2, memory: '4g' },
  tools: ['node', 'npm']
}
```

No other changes are needed because `normalizeSecurityPolicy` already spreads `profile.docker` into the normalized result and `createBuildRunnerPlan` already carries the whole `buildSecurity` through.

- [ ] **Step 5: Run the two updated tests to verify they PASS**

Run: `npx vitest run test/security/normalize-security-policy.test.js test/security/create-build-runner-plan.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/security/build-profiles.js test/security/normalize-security-policy.test.js test/security/create-build-runner-plan.test.js
git commit -m "feat: add dockerfile path to node-webapp build profile"
```

---

## Task 4: Image Ensurer Module

**Files:**
- Create: `src/security/ensure-docker-build-image.js`
- Create: `test/security/ensure-docker-build-image.test.js`

- [ ] **Step 1: Write the failing tests**

Create `test/security/ensure-docker-build-image.test.js`:

```js
import { describe, expect, it, vi } from 'vitest';
import { createDockerImageEnsurer } from '../../src/security/ensure-docker-build-image.js';

const params = {
  image: 'axiom-build-node-webapp:local',
  dockerfile: '/axiom/docker/runner/node-webapp/Dockerfile',
  buildContext: '/axiom'
};

describe('createDockerImageEnsurer', () => {
  it('returns { built: false } when the image already exists', async () => {
    const processRunner = vi.fn(async () => ({ exitCode: 0 }));
    const ensurer = createDockerImageEnsurer({ processRunner });

    const result = await ensurer.ensure(params);

    expect(result).toEqual({ built: false });
    expect(processRunner).toHaveBeenCalledTimes(1);
    expect(processRunner).toHaveBeenCalledWith(
      'docker',
      ['image', 'inspect', 'axiom-build-node-webapp:local'],
      { signal: undefined }
    );
  });

  it('runs docker build with the Dockerfile, tag, and context when the image is missing', async () => {
    const processRunner = vi
      .fn()
      .mockResolvedValueOnce({ exitCode: 1 })
      .mockResolvedValueOnce({ exitCode: 0 });
    const ensurer = createDockerImageEnsurer({ processRunner });
    const onOutput = vi.fn();

    const result = await ensurer.ensure(params, { onOutput, signal: 'signal-value' });

    expect(result).toEqual({ built: true });
    expect(processRunner).toHaveBeenNthCalledWith(
      2,
      'docker',
      [
        'build',
        '-f',
        '/axiom/docker/runner/node-webapp/Dockerfile',
        '-t',
        'axiom-build-node-webapp:local',
        '/axiom'
      ],
      { signal: 'signal-value', onOutput }
    );
  });

  it('throws with DOCKER_BUILD_RUNNER_IMAGE_BUILD_FAILED when the build fails', async () => {
    const processRunner = vi
      .fn()
      .mockResolvedValueOnce({ exitCode: 1 })
      .mockResolvedValueOnce({ exitCode: 2 });
    const ensurer = createDockerImageEnsurer({ processRunner });

    await expect(ensurer.ensure(params)).rejects.toMatchObject({
      code: 'DOCKER_BUILD_RUNNER_IMAGE_BUILD_FAILED',
      message: 'Docker runner image build failed with exit code 2'
    });
  });

  it('does not attempt a build when inspect succeeds, and does not forward onOutput on inspect', async () => {
    const processRunner = vi.fn(async () => ({ exitCode: 0 }));
    const ensurer = createDockerImageEnsurer({ processRunner });
    const onOutput = vi.fn();

    await ensurer.ensure(params, { onOutput });

    expect(processRunner).toHaveBeenCalledTimes(1);
    expect(processRunner.mock.calls[0][2]).toEqual({ signal: undefined });
    expect(onOutput).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run test/security/ensure-docker-build-image.test.js`

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the ensurer**

Create `src/security/ensure-docker-build-image.js`:

```js
/**
 * Purpose: Ensure the Docker build runner image exists locally before launching the runner.
 * Responsibilities:
 * - Check whether the configured image tag is present via `docker image inspect`.
 * - Build the image from the provided Dockerfile and context when it is missing.
 * - Stream build output through the shared onOutput callback.
 */
import { spawn } from 'node:child_process';

export function createDockerImageEnsurer({ processRunner = spawnProcess } = {}) {
  return {
    async ensure({ image, dockerfile, buildContext }, { onOutput, signal } = {}) {
      const inspect = await processRunner(
        'docker',
        ['image', 'inspect', image],
        { signal }
      );

      if (inspect.exitCode === 0) {
        return { built: false };
      }

      const build = await processRunner(
        'docker',
        ['build', '-f', dockerfile, '-t', image, buildContext],
        { signal, onOutput }
      );

      if (build.exitCode !== 0) {
        const error = new Error(`Docker runner image build failed with exit code ${build.exitCode}`);
        error.code = 'DOCKER_BUILD_RUNNER_IMAGE_BUILD_FAILED';
        throw error;
      }

      return { built: true };
    }
  };
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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run test/security/ensure-docker-build-image.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/security/ensure-docker-build-image.js test/security/ensure-docker-build-image.test.js
git commit -m "feat: add docker runner image ensurer"
```

---

## Task 5: CLI Bootstrap Wires Ensurer

**Files:**
- Modify: `src/cli/build-command.js`
- Create: `test/cli/build-command-auto-build.test.js`

- [ ] **Step 1: Write the failing wiring tests**

Create `test/cli/build-command-auto-build.test.js`:

```js
import { describe, expect, it, vi } from 'vitest';
import { buildCommand } from '../../src/cli/build-command.js';

function createLogger() {
  return {
    log: vi.fn(),
    error: vi.fn()
  };
}

function createDependencies({ dockerRunnerResult = { exitCode: 0 }, ensurerResult = { built: true }, ensurerError } = {}) {
  const runnerRun = vi.fn(async () => dockerRunnerResult);
  const ensure = vi.fn(async () => {
    if (ensurerError) throw ensurerError;
    return ensurerResult;
  });

  return {
    runnerRun,
    ensure,
    logger: createLogger(),
    deps: {
      runIntentFile: vi.fn(),
      logger: undefined,
      loadIntentFile: vi.fn(async () => ({
        definition: {
          security: {
            build: { mode: 'docker', profile: 'node-webapp' }
          }
        }
      })),
      loadRuntimeConfig: vi.fn(async () => ({
        workspace: { root: './generated' },
        artifacts: { root: './reports' }
      })),
      validateRuntimeConfig: (config) => config,
      createBuildRunnerPlan: () => ({
        kind: 'docker-build-runner-plan',
        intentPath: 'app.axiom.js',
        projectRoot: '/repo',
        runtimeConfigPath: '/repo/axiom.config.js',
        workspaceRoot: '/repo/generated',
        artifactsRoot: '/repo/reports',
        buildSecurity: {
          mode: 'docker',
          profile: 'node-webapp',
          image: 'axiom-build-node-webapp:local',
          dockerfile: 'docker/runner/node-webapp/Dockerfile',
          network: 'restricted',
          resources: { cpu: 2, memory: '4g' }
        },
        env: {}
      }),
      createDockerBuildRunner: () => ({ run: runnerRun }),
      createDockerImageEnsurer: () => ({ ensure }),
      getAxiomPackageRoot: () => '/axiom',
      environment: {},
      projectRoot: '/repo',
      signalHandlers: { register: () => {}, unregister: () => {} }
    }
  };
}

describe('ax build docker-mode auto-build wiring', () => {
  it('calls ensurer with resolved dockerfile and axiom package root before launching the runner', async () => {
    const { ensure, runnerRun, logger, deps } = createDependencies();

    const exitCode = await buildCommand(['app.axiom.js'], { ...deps, logger });

    expect(ensure).toHaveBeenCalledWith(
      {
        image: 'axiom-build-node-webapp:local',
        dockerfile: '/axiom/docker/runner/node-webapp/Dockerfile',
        buildContext: '/axiom'
      },
      expect.objectContaining({ onOutput: expect.any(Function) })
    );

    const ensureCallOrder = ensure.mock.invocationCallOrder[0];
    const runnerCallOrder = runnerRun.mock.invocationCallOrder[0];
    expect(ensureCallOrder).toBeLessThan(runnerCallOrder);
    expect(exitCode).toBe(0);
  });

  it('does not launch the runner when the ensurer fails', async () => {
    const error = new Error('Docker runner image build failed with exit code 1');
    error.code = 'DOCKER_BUILD_RUNNER_IMAGE_BUILD_FAILED';
    const { ensure, runnerRun, logger, deps } = createDependencies({ ensurerError: error });

    const exitCode = await buildCommand(['app.axiom.js'], { ...deps, logger });

    expect(ensure).toHaveBeenCalledTimes(1);
    expect(runnerRun).not.toHaveBeenCalled();
    expect(exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Docker runner image build failed'));
  });

  it('announces the image build before streaming Docker output', async () => {
    const { ensure, logger, deps } = createDependencies();

    await buildCommand(['app.axiom.js'], { ...deps, logger });

    expect(ensure).toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      'Building Axiom runner image axiom-build-node-webapp:local ...'
    );
  });
});
```

- [ ] **Step 2: Run the new test file to verify it fails**

Run: `npx vitest run test/cli/build-command-auto-build.test.js`

Expected: FAIL — `createDockerImageEnsurer` and `getAxiomPackageRoot` are not yet dependencies of `buildCommand`.

- [ ] **Step 3: Wire the ensurer into `src/cli/build-command.js`**

Add imports at the top:

```js
import path from 'node:path';
import { createDockerImageEnsurer as createDockerImageEnsurerDefault } from '../security/ensure-docker-build-image.js';
import { getAxiomPackageRoot as getAxiomPackageRootDefault } from '../runtime/axiom-package-root.js';
```

(The `path` import may already exist — do not duplicate it.)

Extend the `buildCommand` options destructure to accept `createDockerImageEnsurer` and `getAxiomPackageRoot` with defaults to the imported functions.

In `maybeExecuteBuildRunner`, extend the destructured args similarly, then replace the body that constructs and runs the Docker runner with:

```js
try {
  const runnerPlan = createBuildRunnerPlan({
    intentPath: filePath,
    runtimeConfigPath: path.join(path.dirname(resolvedFilePath), 'axiom.config.js'),
    runtimeConfig,
    buildSecurity,
    environment,
    projectRoot
  });

  const axiomPackageRoot = getAxiomPackageRoot();
  const dockerfilePath = path.resolve(
    axiomPackageRoot,
    runnerPlan.buildSecurity.dockerfile
  );

  const writeThrough = (event) => {
    logger[event.stream === 'stderr' ? 'error' : 'log'](event.chunk.trimEnd());
  };

  logger.log(`Building Axiom runner image ${runnerPlan.buildSecurity.image} ...`);

  const ensurer = createDockerImageEnsurer();
  await ensurer.ensure(
    {
      image: runnerPlan.buildSecurity.image,
      dockerfile: dockerfilePath,
      buildContext: axiomPackageRoot
    },
    { signal: controller.signal, onOutput: writeThrough }
  );

  const dockerBuildRunner = createDockerBuildRunner();
  const result = await dockerBuildRunner.run(runnerPlan, {
    signal: controller.signal,
    onOutput: writeThrough
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
```

Note: the announcement line is printed *unconditionally* before the ensurer runs. This is acceptable because the ensurer is cheap when the image already exists and the line is short. If deferring to "only when building" is desired later, the ensurer can be split into `inspect` + `build` phases; the current plan keeps the announcement simple.

- [ ] **Step 4: Run the wiring test file to verify it passes**

Run: `npx vitest run test/cli/build-command-auto-build.test.js`

Expected: PASS.

- [ ] **Step 5: Run the existing build-command tests and update Docker-mode cases**

Run: `npx vitest run test/cli/build-command.test.js`

The existing "launches Docker runner on the host" test (and any other Docker-mode cases) will break: the default `createDockerImageEnsurer` spawns real `docker` via `child_process.spawn`, and any test that exercises the Docker bootstrap will now hit that path. This is expected — update those specific test cases to inject a stub `createDockerImageEnsurer: () => ({ ensure: vi.fn(async () => ({ built: true })) })` and, for consistency, `getAxiomPackageRoot: () => '/axiom'` (or any stable test path). Non-Docker test cases (local mode, VM mode, usage errors) do not require changes.

Expected after stubs: all existing tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/cli/build-command.js test/cli/build-command-auto-build.test.js
git commit -m "feat: auto-build docker runner image before launch"
```

---

## Task 6: Root README Note

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Locate the existing security/docker section**

Open `README.md` and find the section that describes `security.build.mode: "docker"`. If no such section exists, add a short subsection under the existing Security Policy block.

- [ ] **Step 2: Add the auto-build note**

Add one short paragraph:

```markdown
When you run `ax build` with `security.build.mode: "docker"`, Axiom will build the runner image `axiom-build-node-webapp:local` from `docker/runner/node-webapp/Dockerfile` on first use. All Docker build output is streamed to your terminal. After pulling Axiom source updates, force a rebuild with `docker image rm axiom-build-node-webapp:local` (or `npm run docker:runner:build`).
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: note docker runner auto-build behavior in main README"
```

---

## Task 7: Verification And Plan Reconciliation

**Files:**
- Modify: `docs/superpowers/plans/2026-04-18-docker-runner-local-auto-build.md` (this file — check off remaining steps as you complete the final verification)

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: all non-skipped tests PASS.

- [ ] **Step 2: Manual Docker smoke (requires Docker daemon)**

This step is optional and only if Docker is available:

Run: `docker image rm axiom-build-node-webapp:local || true`

Then: `sudo -n npm run docker:runner:build`

Expected: Docker builds `axiom-build-node-webapp:local` from the repo Dockerfile without errors.

Finally: `sudo -n npm run docker:runner:smoke`

Expected: exits 0 and prints the installed `ax` executable path.

If Docker is not available locally, skip this step and note the skip in the commit body of Task 7 Step 4.

- [ ] **Step 3: Reconcile plan**

Edit this plan file and ensure every `- [ ]` checkbox from Tasks 1–6 is marked `- [x]` to reflect the completed work. Leave Task 7 steps that were not run (e.g., if Docker was unavailable for Step 2) as `- [ ]` with a note.

- [ ] **Step 4: Commit the plan reconciliation**

```bash
git add docs/superpowers/plans/2026-04-18-docker-runner-local-auto-build.md
git commit -m "docs: reconcile docker runner auto-build plan"
```

---

## Self-Review

- **Spec coverage:** every In-Scope item from the spec is represented (tag rename, `dockerfile` profile field, package-root helper, ensurer, CLI wiring, error code, output streaming, documentation).
- **Placeholder scan:** no `TODO`, `TBD`, or placeholder tags remain.
- **Type consistency:** `image`, `dockerfile`, `buildContext` appear consistently as flat fields on `buildSecurity` / `BUILD_PROFILES['node-webapp'].docker`, matching `normalizeSecurityPolicy`'s existing spread behavior.
- **Test determinism:** no unit test requires Docker. The manual Docker smoke in Task 7 Step 2 is the only Docker-dependent step and is explicitly optional.
- **Commit hygiene:** seven commits cover (1) tag rename, (2) package root helper, (3) dockerfile profile field, (4) ensurer module, (5) CLI wiring, (6) root README note, (7) plan reconciliation. Each is independently revertable.
