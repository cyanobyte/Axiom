# Runtime Config

Axiom loads `axiom.config.js` from the same directory as the target intent file.

The intent file stays provider-agnostic. Runtime wiring belongs in config.

## What Config Controls

Runtime config currently wires:

- `agents`
- `workers`
- `workspace`
- `artifacts`

## Minimal Shape

At minimum, the runtime expects:

```js
export default {
  agents: {
    planner: { provider: "fake" }
  },
  workers: {
    shell: { type: "fake-shell" }
  },
  workspace: {
    root: "./generated"
  },
  artifacts: {
    root: "./reports"
  }
};
```

## Validation Rules

The runtime currently requires:

- at least one agent
- `workers.shell`
- `workspace.root`
- `artifacts.root`

If those are missing, `ax analyze` and `ax build` will fail early with config diagnostics.

## Example Configs

Useful reference files:

- `examples/basic/axiom.config.js`
- `examples/cli/axiom.config.js`
- `examples/live-counter/axiom.config.js`
- `examples/dogfood/axiom.config.js`

## Current Limitation

`ax init --existing` does not generate `axiom.config.js` yet. You still need to author it explicitly.

## Related Docs

- [CLI Reference](/mnt/d/Science451/Axiom/docs/cli.md)
- [Examples](/mnt/d/Science451/Axiom/docs/examples.md)
- [Troubleshooting](/mnt/d/Science451/Axiom/docs/troubleshooting.md)
