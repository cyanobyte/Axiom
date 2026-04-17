# Docker Build Security Design

## Goal

Implement real Docker-backed build command execution for source-declared `security.build.mode: "docker"` while preserving the existing security policy model and leaving VirtualBox VM execution as a shaped follow-up.

The current security layer validates build policies and reports them, but all shell work still runs through the configured worker adapter. This design makes the normalized build security policy affect command execution without moving adapter credentials or provider details into `.axiom.js`.

## Scope

In scope:

- route runtime shell commands through Docker when `security.build.mode` is `"docker"`
- derive Docker command flags from official normalized build profiles
- keep `security.build.mode: "local"` behavior unchanged
- return a clear unsupported execution error for `security.build.mode: "vm"` when shell execution is attempted
- keep VM profile shape and reporting intact for future execution work
- keep tests deterministic by testing generated Docker invocations through fake process runners

Out of scope:

- building Docker images
- accepting arbitrary user Docker images
- cloud VM execution
- VirtualBox/Packer execution
- long-running container lifecycle management
- per-step mixed execution modes
- moving runtime adapter credentials into `.axiom.js`

## Source And Config Model

`.axiom.js` remains the source of security policy:

```js
security: {
  build: {
    mode: "docker",
    profile: "node-webapp"
  }
}
```

Runtime config remains the source of concrete adapter wiring:

```js
export default {
  workers: {
    shell: { type: "local-shell" }
  },
  workspace: {
    root: "./generated"
  }
};
```

Docker build security does not introduce a new runtime config worker type. Instead, runtime creates a security-aware worker wrapper around the configured shell worker. The wrapper decides how `ctx.worker("shell").exec(...)` runs based on the normalized `file.definition.security.build`.

This keeps one source of truth for security intent and one source of truth for local capabilities.

## Architecture

Add a secure worker boundary between `ctx.worker(name)` and the configured worker adapter.

For each worker request:

1. `createRunContext` receives `file.definition.security`.
2. `ctx.worker(name)` resolves the configured worker adapter through `adapters.workers.worker(name)`.
3. The configured worker is wrapped by `createSecureWorkerAdapter`.
4. `exec(spec, options)` is handled according to `security.build.mode`.

Mode behavior:

- no `security.build`: use configured worker unchanged
- `local`: use configured worker unchanged
- `docker`: run the command through `createDockerShellAdapter`
- `vm`: throw a clear unsupported execution error

The wrapper should preserve the existing worker response shape:

```js
{
  ...spec,
  stdout: "string",
  stderr: "string",
  exitCode: 0
}
```

Non-zero exit codes remain runtime step failures because `createRunContext` already throws when a worker result has a non-zero `exitCode`.

## Components

### `src/security/create-secure-worker-adapter.js`

Responsible for applying build security policy to worker execution.

Public API:

```js
export function createSecureWorkerAdapter({ worker, buildSecurity, workspace }) {
  return {
    exec(spec, options) {
      // mode-based execution
    }
  };
}
```

Rules:

- if `buildSecurity` is missing, call `worker.exec(spec, options)`
- if `buildSecurity.mode === "local"`, call `worker.exec(spec, options)`
- if `buildSecurity.mode === "docker"`, call a Docker shell adapter
- if `buildSecurity.mode === "vm"`, throw an error with code `UNSUPPORTED_BUILD_SECURITY_MODE`

The thrown VM error message should be:

```text
security.build.mode "vm" is validated but VM command execution is not implemented yet.
```

### `src/security/create-docker-shell-adapter.js`

Responsible for converting a worker command spec into a Docker command executed by a process runner.

Public API:

```js
export function createDockerShellAdapter({ buildSecurity, workspace, runner = defaultRunner }) {
  return {
    exec(spec, options) {
      // docker run ...
    }
  };
}
```

The adapter builds a `docker run --rm` command using the normalized Docker profile:

- image: `buildSecurity.image`
- network: `--network none` when `buildSecurity.network === "restricted"`
- workspace mount: `-v <workspace.root()>:/workspace`
- working directory: map `spec.cwd` under the workspace to `/workspace/...`
- env allowlist: pass only allowed variables present in `process.env`
- resources: `--cpus <cpu>` and `--memory <memory>`
- command: run through `sh -lc <spec.command>`

The command should be executed without `shell: true` by spawning:

```js
spawn("docker", args, { cwd: workspace.root() })
```

Testing should inject a fake runner so unit tests do not require Docker.

### `src/runtime/create-run-context.js`

Responsible for applying the secure worker wrapper when runtime code calls `ctx.worker(name)`.

Existing behavior:

```js
const worker = adapters.workers.worker(name);
```

New behavior:

```js
const worker = createSecureWorkerAdapter({
  worker: adapters.workers.worker(name),
  buildSecurity: file.definition.security?.build,
  workspace: adapters.workspace
});
```

The rest of `ctx.worker(name).exec(...)` remains unchanged.

### `src/adapters/create-configured-adapters.js`

No new worker type is required for the first implementation.

The existing `local-shell` worker remains the process runner that can invoke `docker`. The security wrapper decides when Docker is required.

### `src/security/create-security-report.js`

No schema change is required in the first slice. The report already records `mode`, `profile`, `provider`, status, and warnings. Docker execution failures should surface through normal step diagnostics.

## Docker Command Mapping

Given:

```js
buildSecurity: {
  mode: "docker",
  profile: "node-webapp",
  image: "ghcr.io/science451/axiom-build-node-webapp:latest",
  network: "restricted",
  env: { allow: ["PATH", "HOME", "NODE_ENV"] },
  resources: { cpu: 2, memory: "4g" }
}
```

And:

```js
spec: {
  command: "npm test",
  cwd: "/repo/generated"
}
```

The Docker adapter should run equivalent arguments:

```bash
docker run --rm \
  --network none \
  --cpus 2 \
  --memory 4g \
  -e PATH=<value> \
  -e HOME=<value> \
  -e NODE_ENV=<value> \
  -v /repo/generated:/workspace \
  -w /workspace \
  ghcr.io/science451/axiom-build-node-webapp:latest \
  sh -lc "npm test"
```

If `spec.cwd` is inside the workspace root, map it to the corresponding `/workspace/...` path. If `spec.cwd` is missing, use `/workspace`. If `spec.cwd` is outside the workspace root, reject the command before Docker execution with:

```text
Docker build security only allows command cwd inside the configured workspace.
```

This preserves the workspace boundary promised by the security profile.

## Error Handling

Docker unavailable:

- If the Docker process cannot start, propagate the spawn error through the existing runtime error path.
- The final run result should have `status: "failed"` and a diagnostic produced by existing runtime error formatting.

Docker command exits non-zero:

- Return the worker result with the Docker process `exitCode`.
- Existing `createRunContext` worker handling converts non-zero exit codes into a failed step.

Unsupported VM execution:

- Throw an `Error` with `code: "UNSUPPORTED_BUILD_SECURITY_MODE"`.
- Existing runtime error formatting records the failure.
- The message must make clear that VM policy validation exists but VM command execution is not implemented in this slice.

Workspace escape:

- Reject before spawning Docker.
- Error code: `SECURITY_WORKSPACE_BOUNDARY`.
- Message: `Docker build security only allows command cwd inside the configured workspace.`

## Testing

Unit tests should avoid requiring Docker.

New tests:

- `test/security/create-secure-worker-adapter.test.js`
  - local mode delegates to the configured worker
  - missing build security delegates to the configured worker
  - docker mode uses Docker adapter behavior
  - vm mode throws the unsupported execution error

- `test/security/create-docker-shell-adapter.test.js`
  - builds expected Docker args from the normalized `node-webapp` profile
  - maps workspace root cwd to `/workspace`
  - maps nested workspace cwd to `/workspace/<relative>`
  - rejects cwd outside workspace
  - passes only env allowlist variables that exist

- `test/runtime/build-security-worker.test.js`
  - `runIntent` under docker build security routes `ctx.worker("shell").exec(...)` through Docker
  - local build security keeps existing fake worker behavior
  - VM build security fails when workflow tries to execute a worker command

Existing tests:

```bash
npm test -- test/runtime/run-intent.test.js test/runtime/create-run-context.test.js test/runtime/security-report.test.js
npm test -- test/security/normalize-security-policy.test.js
```

Final verification:

```bash
npm test
```

## Migration And Compatibility

Existing intent files without `security.build` keep their current behavior.

Existing intent files with `security.build.mode: "local"` keep their current behavior.

Intent files that declare Docker build security start executing shell commands through Docker. This is an intentional behavior change because the source now declares an isolation policy.

Intent files that declare VM build security continue to validate and report the VM profile, but workflow shell execution fails with a clear unsupported execution error until VM execution is implemented.

## Future VM Execution Shape

The Docker work should leave these interfaces usable by a later VM adapter:

```js
createSecureWorkerAdapter({ worker, buildSecurity, workspace })
```

When `buildSecurity.mode === "vm"`, a future `createVirtualBoxShellAdapter` can replace the current unsupported error. It should consume:

- `buildSecurity.provider`
- `buildSecurity.profile`
- `buildSecurity.packerTemplate`
- shared network/env/resource/tool profile fields

The future VM adapter should not change `.axiom.js` source shape or runtime config shape.

## Acceptance Criteria

- Docker build security changes command execution, not just reporting.
- Docker command construction is deterministic and unit-tested without Docker.
- Local build security remains backward compatible.
- VM build security has a clear execution error instead of silently running locally.
- Workspace boundary checks prevent Docker mode from running commands outside the configured workspace.
- Full automated test suite passes.
