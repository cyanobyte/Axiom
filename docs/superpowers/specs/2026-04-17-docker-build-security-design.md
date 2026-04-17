# Docker Build Runner Security Design

## Goal

Implement Docker-backed build isolation by having the host Axiom CLI launch a local Docker runner that executes the full Axiom build inside the container.

The previous New MVP security work validates `security.build` and produces reports, but build execution still happens on the host. This design changes Docker mode from "policy only" to "run the actual build in an isolated runner," while keeping VirtualBox VM execution as a future backend that can use the same runner contract.

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

the host `ax build` process should not execute the authored workflow directly. It should:

1. inspect enough intent metadata to discover and normalize `security.build`
2. see `mode: "docker"`
3. launch an official Axiom runner Docker image for that profile
4. mount the project/source and writable output locations
5. pass explicit allowlisted environment variables and secrets
6. run `ax build <intent-file> --inside-runner` inside the container
7. stream output and return the inner build exit code

Inside the container, Axiom runs normally. It loads the `.axiom.js`, executes the workflow, calls AI agents, materializes files, runs shell workers, performs verification, and writes reports from inside the runner.

## Why Runner Instead Of Worker Wrapper

The worker-wrapper approach only isolates individual shell commands:

```text
host Axiom runtime -> Docker runs npm test
```

That is useful locally, but it is the wrong shape for future cloud execution. At cloud scale, the isolated environment should own the whole build:

```text
host/client submits job -> runner executes ax build -> runner emits events/results
```

The local Docker runner is the small version of that future cloud runner. The host starts Docker directly for now. Later, the same runner contract can be submitted to a remote control plane instead of local Docker.

## Scope

In scope:

- add a Docker runner launch path for `security.build.mode: "docker"`
- run the full inner `ax build` inside the Docker runner
- add an `--inside-runner` guard to prevent recursive Docker launch
- preserve local mode behavior
- keep VM mode validated and reported, but fail with a clear unsupported execution error when host build tries to launch it
- define a runner payload/contract that can later back cloud runners
- keep tests deterministic by injecting fake Docker/process runners

Out of scope:

- cloud control plane
- remote job queue
- source bundle upload
- artifact object storage
- VM/VirtualBox execution
- Packer image creation
- building runner images during `ax build`
- arbitrary user-supplied Docker images
- Docker-in-Docker
- running mixed local and Docker steps in one build

## Execution Model

### Local Mode

For no `security.build`, or:

```js
security: {
  build: { mode: "local" }
}
```

the existing host runtime behavior stays unchanged.

### Docker Mode

For:

```js
security: {
  build: {
    mode: "docker",
    profile: "node-webapp"
  }
}
```

host execution becomes a launcher:

```text
host ax build
  -> inspect security.build
  -> normalize profile
  -> launch Docker runner
  -> stream output
  -> exit with runner status
```

runner execution becomes the real build:

```text
container ax build --inside-runner
  -> load .axiom.js
  -> create runtime context
  -> call AI agents using configured adapters
  -> materialize files
  -> run worker commands inside the container
  -> perform verification
  -> write build/security reports
```

### VM Mode

For:

```js
security: {
  build: {
    mode: "vm",
    provider: "virtualbox",
    profile: "node-webapp"
  }
}
```

the policy continues to validate. Execution should fail before the authored workflow runs with:

```text
security.build.mode "vm" is validated but VM build runners are not implemented yet.
```

Error code:

```text
UNSUPPORTED_BUILD_RUNNER
```

## Bootstrap Guard

The runner must not recursively launch itself.

Add an explicit CLI flag:

```bash
ax build app.axiom.js --inside-runner
```

and set an environment marker in the Docker container:

```bash
AXIOM_RUNNER=1
AXIOM_RUNNER_KIND=docker
```

Bootstrap rules:

- host `ax build` with Docker security and no `--inside-runner`: launch Docker runner
- inner `ax build --inside-runner`: execute normally inside current process
- if `--inside-runner` is set but `AXIOM_RUNNER` is missing: fail with a clear invalid runner environment error
- if `AXIOM_RUNNER` is set but `--inside-runner` is missing: allow normal execution, but do not launch a nested runner

The CLI flag is the primary guard because it is explicit. The environment marker records where the build is running and helps diagnostics.

## Intent Inspection

The host needs to discover `security.build` before deciding whether to launch Docker.

For the first implementation, it may use the existing intent loading path because that matches current Axiom source behavior. The design acknowledges that loading `.axiom.js` can execute JavaScript module top-level code. Future hardening can introduce a statically extractable security manifest or sidecar metadata.

Host inspection should stop after normalized definition loading. It must not execute the intent workflow callback before launching Docker.

## Runner Contract

Represent the local Docker runner launch with an internal payload:

```js
{
  intentPath: "examples/basic/counter-webapp.axiom.js",
  projectRoot: "/repo",
  workspaceRoot: "/repo/examples/basic/generated",
  artifactsRoot: "/repo/examples/basic/reports",
  runtimeConfigPath: "/repo/examples/basic/axiom.config.js",
  buildSecurity: {
    mode: "docker",
    profile: "node-webapp",
    image: "ghcr.io/science451/axiom-build-node-webapp:latest",
    network: "restricted",
    env: { allow: ["PATH", "HOME", "NODE_ENV"] },
    resources: { cpu: 2, memory: "4g" },
    tools: ["node", "npm"]
  },
  env: {
    NODE_ENV: "development"
  }
}
```

This contract should live in code as a plain object, not as a public file format yet. It creates the seam for future cloud submission.

## Docker Runner Command

The Docker launcher should run the official runner image from the normalized build profile.

Conceptual command:

```bash
docker run --rm \
  --network none \
  --cpus 2 \
  --memory 4g \
  -e AXIOM_RUNNER=1 \
  -e AXIOM_RUNNER_KIND=docker \
  -e NODE_ENV=development \
  -v /repo:/workspace/source:ro \
  -v /repo/examples/basic/generated:/workspace/generated \
  -v /repo/examples/basic/reports:/workspace/reports \
  -w /workspace/source \
  ghcr.io/science451/axiom-build-node-webapp:latest \
  ax build examples/basic/counter-webapp.axiom.js --inside-runner
```

Mount rules:

- project root mounted read-only at `/workspace/source`
- generated workspace mounted writable at `/workspace/generated`
- artifact/report directory mounted writable at `/workspace/reports`

The first implementation may use existing runtime config values to determine `workspaceRoot` and `artifactsRoot`. If a path is relative, resolve it from the runtime config file directory, matching existing adapter behavior.

## Runner Image Assumptions

The official Docker profile image must contain:

- Node.js
- npm
- Axiom CLI/runtime
- the package manager/tooling required by the profile
- a shell compatible with `sh -lc`

The first implementation should not build this image. It should generate the Docker command for the configured profile image and fail clearly if Docker cannot pull or start it.

## Implementation Notes

- Runtime config workspace paths are resolved from the process project root for the first Docker runner implementation, matching current CLI execution behavior.
- Artifact paths keep the existing adapter model: relative artifact roots resolve from the resolved workspace root.
- Live Docker image pull and image build are outside this slice; deterministic coverage uses an injected process runner.

## Secrets And Environment

Do not pass the full host environment into the runner.

Use the normalized profile allowlist:

```js
env: { allow: ["PATH", "HOME", "NODE_ENV"] }
```

Only variables present in both the allowlist and `process.env` should be passed.

Future profiles can add explicit AI credential variables, but those must remain allowlisted. This design intentionally avoids implicit secret sharing.

The Docker command construction must avoid logging secret values in diagnostics. Tests should assert the selected variable names and argument shape without requiring real secret values.

## Runtime Config Inside Runner

Runtime config remains project-local:

```text
examples/basic/axiom.config.js
```

The inner runner loads it normally. Config must be valid inside the mounted paths. For the Docker MVP:

- source paths resolve under `/workspace/source`
- workspace paths should resolve to `/workspace/generated`
- artifact paths should resolve to `/workspace/reports`

If existing config path resolution cannot support this cleanly, the implementation should introduce runner path overrides through environment variables:

```bash
AXIOM_WORKSPACE_ROOT=/workspace/generated
AXIOM_ARTIFACTS_ROOT=/workspace/reports
```

The overrides should be applied only inside runner mode.

## Output And Results

MVP output streaming:

- host streams Docker stdout/stderr to the current process stdout/stderr
- host exits with the Docker process exit code

Structured follow-up:

- inner runner writes normal Axiom result/artifact files into mounted report directories
- future cloud runners can stream structured events over an API instead of stdout

The local Docker MVP does not need a separate event protocol as long as existing reports are available through mounted artifacts.

## Error Handling

Docker unavailable:

- host launcher fails before inner build starts
- host result is a failed CLI command
- message should include `Docker build runner could not start`

Docker exits non-zero:

- host `ax build` exits with the same non-zero code
- stdout/stderr from the inner build is preserved

Unsupported VM:

- host `ax build` fails before workflow execution
- error code: `UNSUPPORTED_BUILD_RUNNER`
- message: `security.build.mode "vm" is validated but VM build runners are not implemented yet.`

Invalid runner flag:

- `--inside-runner` without `AXIOM_RUNNER=1` fails
- error code: `INVALID_RUNNER_ENVIRONMENT`
- message: `--inside-runner requires AXIOM_RUNNER=1.`

Missing runner image or Docker pull failure:

- rely on Docker process stderr
- add a short Axiom diagnostic prefix so users know the failure occurred while launching the build runner

## Components

### `src/security/create-build-runner-plan.js`

Creates the internal runner payload from:

- intent path
- loaded intent definition
- runtime config path/config
- normalized `security.build`

This module performs path resolution and env allowlist selection. It does not spawn Docker.

### `src/security/create-docker-build-runner.js`

Converts a runner payload into a Docker process invocation.

Public API:

```js
export function createDockerBuildRunner({ runner = defaultRunner } = {}) {
  return {
    run(plan, options) {
      // spawn docker with deterministic args
    }
  };
}
```

Tests inject `runner` to avoid requiring Docker.

### `src/cli/build-command.js`

Adds the bootstrap decision:

- parse `--inside-runner`
- load intent/config enough to inspect security
- if Docker and not inside runner, create and run Docker build runner
- if VM and not inside runner, fail unsupported
- otherwise call existing `runIntentFile`

The existing local path remains the default.

### `bin/ax.js`

Accepts and forwards the `--inside-runner` flag for `ax build`.

### `src/public/run-intent-file.js`

May need runner-aware path overrides for workspace/artifact roots if runtime config paths cannot be made correct through mounts alone.

The first implementation should prefer environment overrides only if tests show current resolution is insufficient.

## Tests

Unit tests should not require Docker.

New tests:

- `test/security/create-build-runner-plan.test.js`
  - creates a Docker runner plan from normalized `node-webapp` security
  - resolves relative workspace and artifact roots from runtime config directory
  - passes only allowlisted environment variables
  - includes `AXIOM_RUNNER` and `AXIOM_RUNNER_KIND`

- `test/security/create-docker-build-runner.test.js`
  - builds expected `docker run` args
  - mounts source read-only
  - mounts workspace and reports writable
  - applies network/resource flags
  - runs `ax build <intent> --inside-runner`
  - returns the runner exit code/stdout/stderr shape

- `test/cli/build-command-runner.test.js`
  - Docker build security launches the Docker runner instead of local `runIntentFile`
  - `--inside-runner` executes the normal local build path
  - VM build security fails with `UNSUPPORTED_BUILD_RUNNER`
  - `--inside-runner` without `AXIOM_RUNNER=1` fails with `INVALID_RUNNER_ENVIRONMENT`

Existing regression tests:

```bash
npm test -- test/cli/build-command.test.js test/public/run-intent-file.test.js
npm test -- test/security/normalize-security-policy.test.js test/runtime/security-report.test.js
```

Final verification:

```bash
npm test
```

## Migration And Compatibility

Existing intent files without `security.build` keep current local behavior.

Existing intent files with `security.build.mode: "local"` keep current local behavior.

Intent files with `security.build.mode: "docker"` change from "validated and reported" to "executed inside Docker." This is the intended behavior because the source declares Docker isolation.

Intent files with `security.build.mode: "vm"` continue to validate, but `ax build` fails before workflow execution until a VM runner backend exists.

## Future Cloud Runner Shape

The local Docker runner plan should be close to a future cloud job payload:

```js
{
  intentPath,
  sourceBundleRef,
  runtimeConfig,
  buildSecurity,
  env,
  secretsRefs,
  artifactDestination
}
```

The future cloud version should replace:

```text
host CLI -> local docker run
```

with:

```text
host CLI -> submit build job -> cloud runner executes ax build --inside-runner
```

The inner runner behavior should remain the same.

## Acceptance Criteria

- `ax build` with Docker build security launches a Docker runner instead of executing the workflow on the host.
- The Docker runner executes `ax build <intent> --inside-runner`.
- The recursion guard prevents nested runner launches.
- Docker command construction is deterministic and tested without Docker.
- Local build behavior is unchanged.
- VM build security fails with a clear unsupported runner error.
- Environment passing is explicit and allowlisted.
- Source is mounted read-only; generated workspace and reports are writable.
- Full automated test suite passes.
