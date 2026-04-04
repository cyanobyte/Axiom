# CLI Reference

The current CLI entrypoint is:

```bash
ax <command>
```

Install it from the repo root with:

```bash
npm install
npm link
```

Current install model:

- `ax` is currently expected to be installed from this repository with `npm link`
- publishing to a package registry is not set up yet

Available commands:

- `build`
- `analyze`
- `fix`
- `init --existing`

## `ax build`

Build an authored intent file:

```bash
ax build examples/basic/counter-webapp.axiom.js
```

Or rely on local file discovery when the current directory contains exactly one `.axiom.js` file:

```bash
ax build
```

Options:

- `--verbose`
  Show raw provider transcript output instead of filtering noisy provider chatter.

Behavior:

- prints step progress
- prints actionable diagnostics on failure
- prints a final health summary
- prints the full structured result JSON

Exit codes:

- `0` on pass
- `1` on failure
- `130` on interrupt

## `ax analyze`

Analyze authored source and runtime config without mutating files:

```bash
ax analyze examples/cli/echo-tool.axiom.js
```

Output shape:

- `errors`
- `warnings`
- `suggestions`

`analyze` currently focuses on:

- source loading
- runtime config loading and validation
- readiness checks
- supported source-quality fixes

## `ax fix`

Apply one explicit supported source rewrite:

```bash
ax fix examples/cli/echo-tool.axiom.js --apply compact-build-defaults
```

Current supported fix IDs include:

- `compact-build-defaults`
- `web-build-test-command`
- `meta-summary`
- `empty-scope`

Behavior:

- requires an explicit fix ID
- mutates source only when the fix applies
- reports the applied change in structured output

## `ax init --existing`

Bootstrap a starter intent file for an existing project:

```bash
ax init --existing .
```

Current behavior:

- inspects `package.json`
- guesses project name
- guesses a simple domain shape
- writes a starter `.axiom.js`

Current limitation:

- it does not create `axiom.config.js`
- it is intentionally conservative and incomplete

## Related Docs

- [Getting Started](/mnt/d/Science451/Axiom/docs/getting-started.md)
- [Authoring Intents](/mnt/d/Science451/Axiom/docs/authoring-intents.md)
- [Troubleshooting](/mnt/d/Science451/Axiom/docs/troubleshooting.md)
