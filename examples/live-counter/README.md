# Live Counter Example

This is the manual live-smoke workspace for full MVP acceptance.

It exists separately from `examples/basic/` so a real generated run can write files into this
directory without mutating the deterministic beginner example used by the automated suite.
Generated app files are written under `generated/` so reruns do not turn this example directory
into a nested Node package.

Run it with:

```bash
node ../../bin/axiom.js run counter-webapp.axiom.js
```

Expected live behavior:

- `briefing`, `planner`, and `coder` run through the local `codex` CLI
- `planner` and `coder` return structured JSON
- generated files are written into `generated/`
- `npm test` runs in `generated/`
- the generated project writes `generated/reports/counter-ui.json`
- Axiom verifies the report and returns a structured result
