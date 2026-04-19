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

## Security Policy

Axiom intent files can declare source-controlled security policy:

```js
security: {
  build: {
    mode: "docker",
    profile: "node-webapp"
  },
  app: {
    target: "web-app",
    profile: "browser-app-basic",
    violationAction: "break"
  }
}
```

`security.build` controls where AI/build work runs. New MVP supports `local`, `docker`, and `vm`; VM execution supports `provider: "virtualbox"` first.

When you run `ax build` with `security.build.mode: "docker"`, Axiom will build the runner image `axiom-build-node-webapp:local` from `docker/runner/node-webapp/Dockerfile` on first use. All Docker build output is streamed to your terminal. After pulling Axiom source updates, force a rebuild with `docker image rm axiom-build-node-webapp:local` (or `npm run docker:runner:build`).

`security.app` controls what the generated application is allowed to do. Axiom runs static checks and an AI security review, then writes findings into the build security report.

## Docs

- [Developer Setup](/mnt/d/Science451/Axiom/docs/dev-setup.md)
- [Getting Started](/mnt/d/Science451/Axiom/docs/getting-started.md)
- [CLI Reference](/mnt/d/Science451/Axiom/docs/cli.md)
- [Authoring Intents](/mnt/d/Science451/Axiom/docs/authoring-intents.md)
- [Runtime Config](/mnt/d/Science451/Axiom/docs/runtime-config.md)
- [Examples](/mnt/d/Science451/Axiom/docs/examples.md)
- [Troubleshooting](/mnt/d/Science451/Axiom/docs/troubleshooting.md)

## Skills

Axiom ships four Claude Code skills under `.claude/skills/` that drive the `ax` CLI conversationally:

- `axiom-authoring` — co-author a new `.axiom.js` file.
- `axiom-build` — run `ax build` and summarize the result.
- `axiom-analyze` — run `ax analyze` and interpret diagnostics.
- `axiom-security-review` — read the most recent build's `securityReport` and guide tightening.

The same guidance is available to Codex (and other `AGENTS.md`-aware agents) via the repo-root `AGENTS.md`, generated from `.claude/skills/`.

### Authoring

Edit a skill file under `.claude/skills/`, then regenerate:

```bash
npm run skills:build
```

Commit both the edited skill file and the updated `AGENTS.md`.

### Drift check

`npm test` includes a check that `AGENTS.md` is in sync with `.claude/skills/`. To run it directly:

```bash
npm run skills:check
```

After substantive skill changes, walk `docs/skills-smoke-checklist.md` once in Claude Code and once in Codex to confirm the guidance produces sensible behavior.

## Examples

- Beginner example: `examples/basic/counter-webapp.axiom.js`
- Docker runner smoke example: `examples/docker-counter/counter-webapp.axiom.js`
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

Manual Docker runner smoke:

```bash
npm run docker:runner:integration
```
