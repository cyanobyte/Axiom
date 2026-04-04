# Axiom
Intent based programming

Axiom treats authored `.axiom.js` files as the primary source and generated project output as disposable build output.

## Quickstart

Install the CLI from the repo root:

```bash
npm install
npm link
```

Current install model:

- Axiom is currently a repo-local CLI tool
- the supported install path is `npm link` from this repository
- registry publishing is not set up yet

Build the deterministic beginner example:

```bash
ax build examples/basic/counter-webapp.axiom.js
```

Analyze an authored intent without mutating it:

```bash
ax analyze examples/cli/echo-tool.axiom.js
```

Apply one explicit supported fix:

```bash
ax fix examples/cli/echo-tool.axiom.js --apply compact-build-defaults
```

Bootstrap a starter intent file for an existing project:

```bash
ax init --existing .
```

## Docs

- [Getting Started](/mnt/d/Science451/Axiom/docs/getting-started.md)
- [CLI Reference](/mnt/d/Science451/Axiom/docs/cli.md)
- [Authoring Intents](/mnt/d/Science451/Axiom/docs/authoring-intents.md)
- [Runtime Config](/mnt/d/Science451/Axiom/docs/runtime-config.md)
- [Examples](/mnt/d/Science451/Axiom/docs/examples.md)
- [Troubleshooting](/mnt/d/Science451/Axiom/docs/troubleshooting.md)

## Examples

- Beginner example: `examples/basic/counter-webapp.axiom.js`
- CLI example: `examples/cli/echo-tool.axiom.js`
- Live smoke example: `examples/live-counter/counter-webapp.axiom.js`
- Dogfood slice example: `examples/dogfood/axiom-runtime-slice.axiom.js`

## Notes

- beginner and CLI examples stay deterministic for automated tests
- generated output is isolated under example `generated/` directories
- `.axiom-build.json` is used for staleness detection and clean rebuild tracking
- the live smoke path is manual and exercises the local CLI-backed provider flow

Manual live smoke:

```bash
ax build examples/live-counter/counter-webapp.axiom.js
```
