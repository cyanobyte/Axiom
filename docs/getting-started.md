# Getting Started

Axiom is a small compiler-style workflow for authored `.axiom.js` intent files.

This guide gets you through the first successful loop:

1. build an example
2. analyze authored source
3. apply an explicit fix

## Prerequisites

- Node.js
- npm

Install dependencies from the repo root:

```bash
npm install
npm link
```

After that, use `ax` as a normal CLI command.

Current install model:

- Axiom is currently installed from this repository with `npm link`
- a published registry install is not set up yet

## 1. Build An Example

Start with the deterministic beginner example:

```bash
ax build examples/basic/counter-webapp.axiom.js
```

That command:

- loads the authored intent file
- loads sibling `axiom.config.js`
- runs the declared workflow
- writes generated output into the example workspace
- prints a structured result and health summary

The generated files for the beginner example are isolated under `examples/basic/generated/`.

## 2. Analyze Authored Source

Use `analyze` before a build when you want source-level diagnostics:

```bash
ax analyze examples/cli/echo-tool.axiom.js
```

`analyze` is read-only. It reports:

- `errors`
- `warnings`
- `suggestions`

It does not mutate the `.axiom.js` file.

## 3. Apply An Explicit Fix

Use `fix` only when you want an explicit source rewrite:

```bash
ax fix examples/cli/echo-tool.axiom.js --apply compact-build-defaults
```

`fix` applies one named supported fix at a time and reports what changed.

Recommended loop:

```bash
ax analyze examples/cli/echo-tool.axiom.js
ax fix examples/cli/echo-tool.axiom.js --apply <fix-id>
ax analyze examples/cli/echo-tool.axiom.js
```

## 4. Start From An Existing Project

To bootstrap a starter intent for an existing codebase:

```bash
ax init --existing .
```

That writes a starter `.axiom.js` file based on simple project inspection. You still need to:

- add `axiom.config.js`
- refine the starter intent
- rerun `analyze`

## 5. Next Docs

- [CLI Reference](/mnt/d/Science451/Axiom/docs/cli.md)
- [Authoring Intents](/mnt/d/Science451/Axiom/docs/authoring-intents.md)
- [Runtime Config](/mnt/d/Science451/Axiom/docs/runtime-config.md)
- [Examples](/mnt/d/Science451/Axiom/docs/examples.md)
- [Troubleshooting](/mnt/d/Science451/Axiom/docs/troubleshooting.md)
