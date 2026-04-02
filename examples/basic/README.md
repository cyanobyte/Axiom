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

For a manual live-provider smoke run, start from `axiom.live.config.js`, adapt it into
`axiom.config.js`, set `OPENAI_API_KEY`, and run:

```bash
node ../../bin/axiom.js run counter-webapp.axiom.js
```

Keep the default `axiom.config.js` deterministic for automated tests. The live path is manual-only.
