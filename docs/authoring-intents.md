# Authoring Intents

An Axiom source file is an authored `.axiom.js` module that exports `intent(...)`.

## Core Shape

A typical intent file looks like:

```js
import { intent } from "@science451/intent-runtime";

export default intent(
  {
    meta: {
      title: "Echo Tool",
      summary: "A tiny CLI that prints the provided message."
    },
    what: {
      capability: "echo_cli_tool",
      description: "Users can run a command that prints the provided message."
    },
    runtime: {
      languages: ["javascript"],
      targets: ["node"],
      platforms: ["linux", "macos", "windows"]
    },
    cli: {
      command: "echo-tool",
      arguments: ["<message>"]
    }
  },
  async (ctx) => {
    return { ok: true };
  }
);
```

## Main Sections

Common authored sections:

- `meta`
- `what`
- `runtime`
- one domain section such as `cli`, `web`, or `library`
- optional `build`

The runtime normalizes compact definitions into the richer internal shape.

## Compact Mode

Compact mode is intended for small self-explanatory projects.

For compact CLI intents, Axiom can derive defaults for:

- `constraints`
- `outcomes`
- `verification`
- some structural metadata

Compact mode works best when:

- the project is small
- the runtime target is obvious
- the CLI or library behavior is straightforward

## When To Stay Explicit

Stay explicit when the project needs:

- custom workflow steps
- complex verification
- multiple build/test stages
- richer architecture declarations
- unusual runtime constraints

The compact path is convenience, not the only authoring model.

## Authoring Philosophy

`.axiom.js` is the source of truth.

Generated output is disposable build output, not the canonical source.

The intended loop is:

1. edit `.axiom.js`
2. run `ax analyze`
3. run `ax fix` when you want an explicit supported rewrite
4. run `ax build`

## Related Docs

- [Getting Started](/mnt/d/Science451/Axiom/docs/getting-started.md)
- [Runtime Config](/mnt/d/Science451/Axiom/docs/runtime-config.md)
- [Examples](/mnt/d/Science451/Axiom/docs/examples.md)
