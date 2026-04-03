# Basic Examples

Start here if you want to understand the runtime shape quickly.

Current example:

- `counter-webapp.axiom.js`
- `axiom.config.js`

This example is intentionally smaller than the richer files under `docs/superpowers/examples/`.
It shows the minimum useful flow:

- declarative intent
- sibling runtime configuration
- a planning step
- a human approval checkpoint
- an implementation step
- a test step
- outcome verification from a report artifact

`counter-webapp.axiom.js` stays provider-agnostic. `axiom.config.js` is where runtime wiring lives, such as which provider/model handles `briefing`, `planner`, and `coder`.

Generated files and build metadata are written under `generated/`. That keeps this example
directory clean and matches the compiler model: edit the `.axiom.js` source, rerun Axiom, and
treat generated output as disposable build artifacts.

The deterministic verification fixture stays in `reports/` next to the example so automated tests
can read a stable tracked artifact while the generated workspace remains disposable.

For a manual live-provider smoke run, use the dedicated live workspace instead:

```bash
node ../../bin/axiom.js run ../live-counter/counter-webapp.axiom.js
```

The live workspace has its own `axiom.config.js` and uses the local `codex` CLI so it can reuse
your existing CLI session. Keep the default `axiom.config.js` here deterministic for automated
tests. The live path is manual-only.
