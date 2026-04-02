# Axiom
Intent based programming

## Examples

- Beginner example: `examples/basic/counter-webapp.axiom.js`
- Example runtime config: `examples/basic/axiom.config.js`
- Live smoke example: `examples/live-counter/counter-webapp.axiom.js`
- Richer examples: `docs/superpowers/examples/`

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
