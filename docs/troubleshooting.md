# Troubleshooting

This page covers the most common current failure modes.

## `No .axiom.js file found`

Cause:

- you ran `ax build` in a directory without a local intent file

Fix:

- run `ax build <file.axiom.js>`
- or move into a directory with exactly one `.axiom.js`

## `Multiple .axiom.js files found`

Cause:

- local file discovery is ambiguous

Fix:

- pass the target explicitly:

```bash
ax build path/to/file.axiom.js
```

## `Missing runtime config: axiom.config.js`

Cause:

- the target intent file has no sibling runtime config

Fix:

- add `axiom.config.js` in the same directory as the target intent file

## Runtime Config Validation Errors

Common causes:

- no agents configured
- missing `workers.shell`
- missing `workspace.root`
- missing `artifacts.root`

Fix:

- update `axiom.config.js` so the runtime wiring is complete

## `Fix <id> does not apply`

Cause:

- you requested a supported fix, but the current source no longer matches that rule

Fix:

- rerun `ax analyze`
- use one of the currently reported fix IDs

## Live Provider Warnings

Example:

- provider tooling warns about missing `bubblewrap`

If the run still passes, this is informational. If the provider cannot execute, install the missing local dependency and rerun.

## Interrupted Builds

If you stop a build with `Ctrl-C`, the CLI returns exit code `130`.

That is expected behavior.

## Related Docs

- [CLI Reference](/mnt/d/Science451/Axiom/docs/cli.md)
- [Runtime Config](/mnt/d/Science451/Axiom/docs/runtime-config.md)
- [Getting Started](/mnt/d/Science451/Axiom/docs/getting-started.md)
