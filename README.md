# Axiom
Intent based programming

## Examples

- Beginner example: `examples/basic/counter-webapp.axiom.js`
- CLI example: `examples/cli/echo-tool.axiom.js`
- Example runtime config: `examples/basic/axiom.config.js`
- Live smoke example: `examples/live-counter/counter-webapp.axiom.js`
- Richer examples: `docs/superpowers/examples/`

The beginner and CLI examples stay deterministic for automated tests. Their generated output is
isolated under `generated/`, and successful runs record `.axiom-build.json` there so Axiom can
detect stale output and rebuild cleanly when `meta.version` changes.

## Running Axiom

Install dependencies:

```bash
npm install
```

Run the beginner example:

```bash
node bin/axiom.js run examples/basic/counter-webapp.axiom.js
```

Analyze an intent file without running it:

```bash
node bin/axiom.js analyze examples/cli/echo-tool.axiom.js
```

This loads:

- `examples/basic/counter-webapp.axiom.js`
- `examples/basic/axiom.config.js`

The default beginner example uses fake agent adapters so the runtime can be exercised without spending model tokens.
When a live provider adapter is implemented, replace the fake agent entries in `examples/basic/axiom.config.js` with provider-backed entries and rerun the same command.

## Live Smoke Path

For a manual live-provider smoke run, use the dedicated live workspace and run:

```bash
node bin/axiom.js run examples/live-counter/counter-webapp.axiom.js
```

The live config under `examples/live-counter/` uses the local `codex` CLI, so it reuses your
existing CLI login instead of requiring a separate API key. This path is manual-only and should
not be part of the default automated suite. Generated app files are isolated under
`examples/live-counter/generated/` so repeated runs do not break package self-resolution.

Normal CLI runs now aim to feel like a readable AI compiler:

- default output keeps live AI activity visible while filtering provider transcript noise
- `--verbose` shows the raw provider transcript
- `Ctrl-C` interrupts the active run cleanly
- failures print compiler-style actionable diagnostics before the full structured result
- `analyze` reports structured `errors`, `warnings`, and `suggestions` without mutating source files
