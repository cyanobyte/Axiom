# Docker Codex Live Counter Example

This is the manual live-smoke workspace for running Codex CLI inside the Docker build runner.

It exists separately from `examples/basic/`, `examples/docker-counter/`, and `examples/live-counter/`
so a real generated Docker run can write files without mutating deterministic examples.
Generated app files are written under `generated/` so reruns do not turn this example directory
into a nested Node package. Successful runs also record `.axiom-build.json` inside `generated/`
so Axiom can detect stale output when `meta.version` changes and cleanly rebuild.

Run it with:

```bash
npm run docker:runner:codex-live
```

Expected live behavior:

- the host `ax` command launches the Docker build runner
- the runner uses the `node-webapp-codex-live` profile with bridge networking
- host Codex `auth.json` and `config.toml` are mounted read-only into `/home/node/.codex`
- `planner` and `coder` run through `codex exec` inside Docker
- `planner` and `coder` return structured JSON
- generated files are written into `generated/`
- `npm test` runs in `generated/`
- the generated project test command starts the generated server and exercises the real HTTP counter flow
- the generated verification script writes `generated/reports/counter-ui.json`
- Axiom verifies the report and returns a structured result
