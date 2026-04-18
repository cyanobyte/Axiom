# Docker Runner Local Auto-Build Design

## Goal

Make the Docker build runner image fully local: rename the image tag to reflect that it is not published to a registry, and have `ax build` transparently build the image from the repo Dockerfile when it is missing. Keep the profile layout compatible with future optional GHCR publishing, hash-based staleness detection, and richer intent-level sandbox declarations.

## Core Direction

When a user runs:

```bash
ax build examples/basic/counter-webapp.axiom.js
```

and the intent declares:

```js
security: {
  build: {
    mode: "docker",
    profile: "node-webapp"
  }
}
```

the host `ax build` launcher should:

1. normalize `security.build` and resolve the runner profile
2. check whether the profile's Docker image exists locally
3. if the image is missing, build it from the repo Dockerfile with live-streamed Docker output
4. if the image build fails, stop before launching the runner and surface the failure
5. otherwise proceed with the existing runner launch path

The runner contract, mounts, env allowlist, and `--inside-runner` behavior from the existing Docker build security design remain unchanged.

## Why Local

The first published iteration of the runner used the tag `ghcr.io/science451/axiom-build-node-webapp:latest`, but no image has ever been pushed to GHCR. The tag implied a registry that was not actually wired up, which confused both users and future contributors.

The simpler and more honest model is:

- the runner image lives in this repo as a Dockerfile
- `ax build` ensures the image exists locally before launching the runner
- no registry is required for the default path
- a future optional GHCR publishing path can be added without rearchitecting the runner

This aligns with Axiom's compiler/build-tool mental model: the repo is the source of truth for the runner image just as it is for the compiler itself.

## Scope

In scope:

- rename the `node-webapp` profile image tag from `ghcr.io/science451/axiom-build-node-webapp:latest` to `axiom-build-node-webapp:local`
- add an image-ensure step that runs before the Docker runner launch
- auto-build the runner image from the repo Dockerfile when the image is missing
- stream the full Docker build output to the CLI with no filtering
- surface image-build failures with a dedicated error code
- document the manual rebuild path for picking up Axiom source updates
- keep all unit tests deterministic with an injected process runner

Out of scope:

- GHCR or other registry publishing
- immutable version tags
- image signing or SBOM generation
- hash-based staleness detection (deferred to Future Work)
- intent-level sandbox `requires` declarations (deferred to a separate design)
- task-graph and parallel worker execution (deferred to a separate design)
- a Docker-backed integration smoke fixture
- changing the runner payload, mounts, or environment allowlist

## Image Tag

Replace every use of `ghcr.io/science451/axiom-build-node-webapp:latest` with `axiom-build-node-webapp:local` across:

- `src/security/build-profiles.js`
- `package.json` scripts (`docker:runner:build`, `docker:runner:smoke`)
- `docker/runner/node-webapp/README.md`
- `test/docker/runner-image.test.js`
- `test/security/create-docker-build-runner.test.js`
- `test/security/create-build-runner-plan.test.js`
- `test/security/normalize-security-policy.test.js`

The tag drops the registry prefix so a naive `docker push` cannot accidentally push it to GHCR. A future GHCR path introduces a second tag (for example `ghcr.io/science451/axiom-build-node-webapp:0.2.0`) alongside the local tag, not in place of it.

## Profile Shape

`src/security/build-profiles.js` gains a `dockerfile` field per profile so the image-ensure step can locate the Dockerfile without hardcoding it elsewhere:

```js
export const BUILD_PROFILES = {
  'node-webapp': {
    docker: {
      image: 'axiom-build-node-webapp:local',
      dockerfile: 'docker/runner/node-webapp/Dockerfile',
      network: 'restricted',
      env: { allow: ['PATH', 'HOME', 'NODE_ENV'] },
      resources: { cpu: 2, memory: '4g' },
      tools: ['node', 'npm']
    },
    vm: { /* unchanged */ }
  }
};
```

The `dockerfile` path is relative to the Axiom package root, not the user's project directory.

## Axiom Package Root

`ax build` is installed into the user's environment through `npm link` from this repo, so the Axiom source tree lives at a known location at runtime. Add a small helper that resolves the Axiom package root from any module inside `src/`:

```text
src/runtime/axiom-package-root.js
```

Public API:

```js
export function getAxiomPackageRoot() {
  // Derives the package root from import.meta.url once and caches it.
}
```

The helper walks up from its own module URL until it finds the `package.json` with `name: "axiom"`. This anchor is used to resolve the Dockerfile path and the Docker build context.

## Image Ensurer

Add a new module:

```text
src/security/ensure-docker-build-image.js
```

Public API:

```js
export function createDockerImageEnsurer({ processRunner = spawnProcess } = {}) {
  return {
    async ensure({ image, dockerfile, buildContext }, { onOutput, signal } = {}) {
      // 1. docker image inspect <image>
      // 2. if exit code 0, return { built: false }
      // 3. otherwise docker build -f <dockerfile> -t <image> <buildContext>
      // 4. if build exits non-zero, throw with code DOCKER_BUILD_RUNNER_IMAGE_BUILD_FAILED
      // 5. otherwise return { built: true }
    }
  };
}
```

The ensurer follows the same `processRunner` injection pattern as `createDockerBuildRunner`. Tests inject a fake runner to avoid requiring Docker.

The ensurer does not implement retry, caching, or staleness detection. If the user wants to rebuild after updating Axiom source, they run `docker image rm axiom-build-node-webapp:local` (or `npm run docker:runner:build`) and the next `ax build` triggers a fresh auto-build.

## Output Streaming

The ensurer streams Docker output through the existing `onOutput` callback pattern used by `createDockerBuildRunner`. The CLI wires `onOutput` directly to `process.stdout` and `process.stderr` with no filtering, buffering, or summarization. Users see exactly what `docker build` prints, including progress lines, image layer pulls, and error output.

Before the build starts, the CLI prints one short diagnostic line so the origin of the upcoming Docker output is obvious:

```text
Building Axiom runner image axiom-build-node-webapp:local ...
```

No similar line is printed when the image already exists.

## CLI Wiring

`src/cli/build-command.js` calls the ensurer before `dockerRunner.run(plan, ...)` in the `maybeExecuteBuildRunner` path:

```js
if (buildSecurity.mode === 'docker') {
  await imageEnsurer.ensure(
    {
      image: runnerPlan.buildSecurity.image,
      dockerfile: resolveDockerfilePath(runnerPlan.buildSecurity.dockerfile),
      buildContext: getAxiomPackageRoot()
    },
    { onOutput: writeThroughToStdio, signal: controller.signal }
  );
  return dockerBuildRunner.run(runnerPlan, { signal: controller.signal, onOutput: writeThroughToStdio });
}
```

`resolveDockerfilePath` joins the profile's `dockerfile` field with the Axiom package root. `writeThroughToStdio` invokes the same logger pathway the existing runner uses.

If the ensurer throws `DOCKER_BUILD_RUNNER_IMAGE_BUILD_FAILED`, `ax build` exits with a non-zero status and does not attempt to launch the runner.

## Error Handling

The ensurer distinguishes two failure shapes:

- **Image inspect fails.** Docker exits non-zero when the image is missing and when the daemon is unavailable. The ensurer treats any non-zero inspect exit as "build required" and proceeds to `docker build`. If the daemon is genuinely down, the `docker build` invocation also fails and surfaces the daemon error through normal stderr.
- **Image build fails.** Throw an error with code `DOCKER_BUILD_RUNNER_IMAGE_BUILD_FAILED`. The CLI has already streamed the Docker build output; it then exits non-zero.

Existing runner failures (`DOCKER_BUILD_RUNNER_START_FAILED`, `UNSUPPORTED_BUILD_RUNNER`, `INVALID_RUNNER_ENVIRONMENT`) are unchanged.

## Tests

New tests:

- `test/security/ensure-docker-build-image.test.js`
  - returns `{ built: false }` when inspect exits 0
  - runs `docker build` with expected args when inspect fails
  - forwards `onOutput` chunks during the build
  - throws with code `DOCKER_BUILD_RUNNER_IMAGE_BUILD_FAILED` when build exits non-zero
- `test/cli/build-command-auto-build.test.js`
  - Docker mode calls the ensurer before the runner
  - ensurer failure prevents `dockerBuildRunner.run` from being called
  - ensurer success allows the normal runner launch

Updated tests:

- `test/docker/runner-image.test.js` — asserts new `:local` tag in Dockerfile, README, and package scripts
- `test/security/create-docker-build-runner.test.js` — updated tag constant
- `test/security/create-build-runner-plan.test.js` — updated tag constant and `dockerfile` field in plan
- `test/security/normalize-security-policy.test.js` — updated tag constant

No Docker daemon is required for any unit test; injected runners remain deterministic.

## Documentation

`docker/runner/node-webapp/README.md` is updated to:

- use the new `axiom-build-node-webapp:local` tag
- describe the auto-build behavior of `ax build`
- keep the manual `npm run docker:runner:build` command as a "build the image yourself" convenience
- document the rebuild path when Axiom source changes: `docker image rm axiom-build-node-webapp:local` then re-run `ax build`
- note that the image is intentionally local-only and not published to any registry in the default flow

`README.md` (repo root) gets a short note in the existing security section mentioning that Docker mode will build the runner image on first use, with all output streamed to the terminal.

## Migration And Compatibility

- Existing intents with `security.build.mode: "local"` — unchanged.
- Existing intents with `security.build.mode: "docker"` and `profile: "node-webapp"` — the first `ax build` after upgrading builds the new local image automatically. Users who already have `ghcr.io/science451/axiom-build-node-webapp:latest` locally can remove it (`docker image rm ...`) or ignore it; nothing in Axiom references that tag after this change.
- Existing intents with `security.build.mode: "vm"` — continue to fail with `UNSUPPORTED_BUILD_RUNNER`.

## Future Work

This plan intentionally keeps the runner-image work narrow. Several follow-up directions are captured here so they are not lost.

### Hash-based staleness detection

Replace the static `:local` tag with `axiom-build-node-webapp:local-<hash>` where the hash is derived from the Dockerfile, `package-lock.json`, `bin/`, and `src/`. Every `ax build` computes the hash, checks that specific tag, and triggers auto-build when the tag is missing. This gives deterministic, automatic rebuilds when Axiom source changes without a manual rebuild step. Old images accumulate locally and can be pruned with `docker image prune` or a dedicated `ax runner prune` command.

### Optional GHCR publishing path

Keep the profile's `image` field as the single source of truth for the runner tag. A later plan can add a second profile variant, a config override, or a publish workflow that pushes a versioned image tag such as `ghcr.io/science451/axiom-build-node-webapp:0.2.0`. The runner launcher already treats the image string as an opaque tag, so pulling from GHCR works without code changes once an image is published.

### Immutable version tags

Tag the local image with the repo commit SHA or the Axiom package version so users can keep multiple runner images side by side during upgrades.

### Image signing and SBOM

Deferred until a registry publishing path exists.

### Docker-backed integration smoke fixture

Add a minimal Docker-mode intent fixture and a Docker-gated end-to-end test that proves the full runner flow, including mounts, live output streaming, and report generation. This separate plan complements the unit-level coverage in this design.

### Intent-level sandbox requires declaration

Let `.axiom.js` authors declare what their intent needs from the sandbox, independent of a profile:

```js
security: {
  build: {
    mode: "docker",
    profile: "node-webapp",
    requires: {
      env: ["DATABASE_URL"],
      tools: ["yarn"],
      mounts: [{ host: "./seed-data", container: "/seed", mode: "ro" }]
    }
  }
}
```

The compiler would validate that the profile can satisfy the intent's requirements before launching, and surface a clear failure when it cannot. Today the only dependency-declaration surface is the profile itself (in Axiom's source tree), which means small intent-level needs force profile changes in the Axiom repo. The follow-up design will make the intent file self-contained for its sandbox shape.

### Task-graph and parallel worker execution

Extend the intent DSL with an explicit task-graph primitive so a single `.axiom.js` can decompose work into independent units that run in parallel workers:

```js
await ctx.parallel([
  ctx.task("frontend", async (t) => { ... }),
  ctx.task("backend",  async (t) => { ... }),
  ctx.task("schema",   async (t) => { ... })
]);
await ctx.task("integrate", { after: ["frontend", "backend", "schema"] }, async (t) => { ... });
```

Local mode spawns one worker container per task with per-task scratch workspaces that merge at convergence. Cloud mode extends the existing runner payload into a formal job descriptor submitted to a control plane, with workers pulling a shared source bundle and writing artifacts to object storage. The follow-up design should cover: event multiplexing, merge/conflict handling, failure and cancellation semantics, and cost/concurrency guardrails for cloud.

## Acceptance Criteria

- The `node-webapp` profile uses the tag `axiom-build-node-webapp:local` everywhere.
- `ax build` in Docker mode builds the runner image from the repo Dockerfile when the image is missing.
- Docker build output is streamed to the terminal unchanged.
- Image build failures surface with error code `DOCKER_BUILD_RUNNER_IMAGE_BUILD_FAILED` and prevent the runner launch.
- The existing Docker runner launch path is unchanged when the image already exists.
- All unit tests are deterministic and pass without a Docker daemon.
- The repo README and runner README reflect the new tag, auto-build behavior, and the manual rebuild path for Axiom source updates.
