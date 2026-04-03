# CLI Example

This example shows the same Axiom compiler loop in a tiny CLI project instead of a web app.

Files:

- `echo-tool.axiom.js`
- `axiom.config.js`

What it demonstrates:

- declarative CLI intent with a recognized `cli` section
- sibling runtime configuration
- a planning step
- a human approval checkpoint
- an implementation step
- a test step
- outcome verification from a tracked report artifact

Generated files and build metadata are written under `generated/`. The tracked verification fixture
stays in `reports/` next to the example so automated tests can stay deterministic.
