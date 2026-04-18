# Developer Setup

This guide gets you from a fresh Linux (or macOS) machine to a working Axiom development environment.

## Prerequisites

- **Node.js 22+** — the repo pins this via `.nvmrc` and `package.json` `engines`. The Docker runner image also uses `node:22-bookworm`.
- **npm** (ships with Node.js).
- **Git**.
- **Docker daemon** (optional, only required for `security.build.mode: "docker"` builds).
- **GitHub CLI `gh`** (optional, only required for creating pull requests from the repo).

If you use `nvm`:

```bash
nvm install
nvm use
```

## Initial Setup

```bash
git clone git@github.com:cyanobyte/Axiom.git
cd Axiom
npm install
npm link
```

`npm link` registers the `ax` command globally, pointing at `bin/ax.js` in this checkout. You can now run `ax build`, `ax analyze`, `ax fix`, and `ax init` from anywhere.

Registry publishing is not yet set up; `npm link` from this repo is the supported install path.

## Running Tests

```bash
npm test
```

Runs the full Vitest suite. The deterministic suite passes without any external services.

One integration test is skipped by default:

- `test/adapters/create-openai-agent-adapter.integration.test.js` — skipped unless `OPENAI_API_KEY` is set in the environment. When set, it makes a real OpenAI Responses API call and asserts the response text.

## Running Examples

### Deterministic Examples (No Credentials Needed)

These examples use the `fake` provider and are what the automated tests exercise:

```bash
ax build examples/basic/counter-webapp.axiom.js
ax build examples/cli/echo-tool.axiom.js
ax build examples/dogfood/axiom-runtime-slice.axiom.js
```

Each example has a sibling `axiom.config.js` that wires every agent to `provider: "fake"` with recorded outputs.

### Live Examples (Require an AI CLI Provider)

The live examples drive a real AI provider and exercise the full CLI-backed loop:

- `examples/live-counter/counter-webapp.axiom.js` — live counter web app via `codex-cli`.
- `examples/basic/counter-webapp.axiom.js` with `AXIOM_CONFIG=examples/basic/axiom.live.config.js` — same beginner example, but live.

These require the **Codex CLI** to be installed and authenticated out-of-band:

```bash
# Install per upstream instructions, then authenticate:
codex login
```

The adapter shells out to `codex exec` (see `src/adapters/providers/create-codex-cli-agent-adapter.js`). Your existing authenticated session is used — Axiom does not manage credentials.

The **Claude CLI** is also supported as a provider (`provider: "claude-cli"`). It shells out to `claude --print` (see `src/adapters/providers/create-claude-cli-agent-adapter.js`). Install and authenticate it the same way.

The **OpenAI adapter** is available (`provider: "openai"`) but not currently used by any example. It expects `apiKey` in the agent config; if you wire it in, source the key from an env var you set yourself.

### Provider Summary

| Provider | Source of Creds | Used By |
|----------|----------------|---------|
| `fake` | None | All deterministic examples and unit tests |
| `codex-cli` | Your `codex login` session | `examples/live-counter/`, `examples/basic/axiom.live.config.js` |
| `claude-cli` | Your `claude` CLI session | Available, not used by shipped examples |
| `openai` | `apiKey` in adapter config | Integration test only, via `OPENAI_API_KEY` |

## Docker-Mode Builds

Intent files can opt into running the full build inside a Docker container:

```js
security: {
  build: {
    mode: "docker",
    profile: "node-webapp"
  }
}
```

The first `ax build` in Docker mode will auto-build the runner image `axiom-build-node-webapp:local` from `docker/runner/node-webapp/Dockerfile`. All Docker build output streams to your terminal. Subsequent runs reuse the built image.

After pulling Axiom source updates, force a rebuild:

```bash
docker image rm axiom-build-node-webapp:local
# Or build it manually:
npm run docker:runner:build
```

Smoke-test the image:

```bash
npm run docker:runner:smoke
```

Run the full host-to-container integration smoke:

```bash
npm run docker:runner:integration
```

This uses `examples/docker-counter/counter-webapp.axiom.js`, which declares `security.build.mode: "docker"` and `profile: "node-webapp"`.

See `docker/runner/node-webapp/README.md` for full details.

## Working on the Codebase

Source layout:

- `bin/ax.js` — CLI entrypoint
- `src/` — runtime, adapters, CLI commands, security policy
- `test/` — Vitest suite mirroring `src/` layout
- `examples/` — deterministic and live example intents
- `docs/` — user-facing docs
- `docs/superpowers/specs/` — design specs
- `docs/superpowers/plans/` — implementation plans

Run a focused test file during development:

```bash
npx vitest run test/path/to/file.test.js
```

Watch mode:

```bash
npx vitest
```

## Troubleshooting

- **`ax: command not found`** — re-run `npm link` from the repo root.
- **Docker permission denied** — add your user to the `docker` group or prefix commands with `sudo`.
- **`codex: command not found`** on live examples — install the Codex CLI and run `codex login` before running the example.
- **Tests hang** — check for orphaned child processes from prior interrupted runs (`pkill -f vitest`).
