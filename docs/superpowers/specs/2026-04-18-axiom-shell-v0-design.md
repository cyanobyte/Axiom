# Axiom Shell v0 Design

## Goal

Introduce a conversational developer shell — invoked as bare `ax` — that sits alongside the existing `ax <subcommand>` CLI and becomes Axiom's primary interactive surface over time. The shell is cross-LLM, owns a native agent loop, exposes Axiom primitives as slash commands, and ships with enough general-purpose developer tools to do real work from inside the shell itself.

v0 is a tight walking skeleton: local-only, Anthropic + OpenAI-compatible providers, minimal tool set, permissive defaults declared in `.axiom.js`. It is explicitly designed so that cross-LLM coverage, skill extensibility, session persistence, and remote execution can grow in place without reworking the agent loop.

## Motivation

Today Axiom is invoked either as one-shot CLI subcommands (`ax build`, `ax analyze`, `ax fix`, `ax init`) or as a library driven by an external agentic harness (Claude Code, Copilot CLI). Neither path delivers a conversational developer experience that is Axiom-native: subcommands have no dialogue, and external harnesses duplicate AI loops that Axiom already has infrastructure to drive.

A dedicated shell gives Axiom:

- a first-class conversational surface where intent authoring, builds, debugging, and verification live together in one session
- a home for cross-LLM usage, including local runners (Ollama, LM Studio, vLLM, llama.cpp server) via the OpenAI-compatible API they already expose
- a place to later consolidate remote-execution control, skill extensions, and generated-app iteration without bolting those onto existing subcommands

## Source Shape — Permission Policy

Shell-level tool permissions are declared in `.axiom.js` under a new subsection of the existing `security` block:

```js
security: {
  build: { mode: "docker", profile: "node-webapp" },
  app: { target: "web-app", profile: "browser-app-basic", violationAction: "warn" },
  shell: {
    defaultAction: "allow",
    tools: {
      Read: "allow",
      Edit: { allow: ["src/**", "test/**"], deny: [".env*", "secrets/**"] },
      Write: { allow: ["src/**", "test/**"] },
      Bash: {
        allow: ["npm *", "git status", "git log *", "git diff*"],
        deny: ["rm -rf *", "git push*", "git reset --hard*"]
      }
    }
  }
}
```

Rules:

- `defaultAction` applies when a tool is not named in `tools`. Valid values: `"allow"`, `"prompt"`, `"deny"`.
- Per-tool value can be a literal action (`"allow" | "prompt" | "deny"`) or a `{ allow, deny }` pattern object.
- Patterns are glob for file paths (Read/Edit/Write) or glob-like for Bash command lines.
- `deny` beats `allow` when both patterns match.
- Remote execution (future) is constrained to tools that evaluate to `"allow"` under the policy — prompts cannot be answered without a user present, so any rule requiring interactive prompting blocks remote dispatch.

The intent-authoring skill is expected to auto-populate a reasonable `security.shell` block based on the declared project needs. Authors tighten it down as risk appetite demands.

## Architecture Overview

The v0 shell is a streaming REPL on top of a native agent loop, with slash commands bridging to Axiom's existing CLI engine and a thin Provider layer abstracting the model backend.

Major boundaries:

- **Entry point.** `bin/ax.js` keeps every existing subcommand unchanged. Bare `ax` (or explicit `ax shell`) starts the shell. Scripting paths (CI, npm scripts) are not affected.
- **Shell module (`src/shell/`).** New directory. Owns the REPL, agent loop, tool registry, slash-command dispatcher, permission checker, and terminal renderer.
- **Provider module (`src/providers/`).** New directory. Small `Provider` interface with two adapters in v0: `AnthropicProvider` (wraps `@anthropic-ai/sdk`) and `OpenAICompatProvider` (wraps `openai`, configurable `baseURL` so Ollama / LM Studio / vLLM / OpenAI cloud all work through one adapter). A tiny normalizer translates each provider's native tool-use + streaming shape into Axiom's internal message types. This layer is streaming-first and tool-use-first.
- **Reuse of existing Axiom CLI.** Slash commands (`/build`, `/analyze`, etc.) import and call the existing command modules (`src/cli/build-command.js`, `src/cli/analyze-command.js`) directly as functions — not via subprocess. One source of truth. Structured results (health report, security report, verifications) land back in conversation history so the LLM sees them.
- **Existing adapters unchanged.** `src/adapters/providers/` (codex-cli, claude-cli, openai) continues to serve scripted `ctx.agent("planner").run(...)` use inside intent files. The shell's Provider layer is a separate, streaming-first concern. These two layers coexist; they are not merged in v0.

## Scope

In scope:

- Bare `ax` (and `ax shell`) launches an interactive REPL
- Streaming assistant output with tool-use support
- Anthropic provider via `@anthropic-ai/sdk`
- OpenAI-compat provider via `openai` SDK with configurable `baseURL` (covers OpenAI cloud, Ollama, LM Studio, vLLM, LocalAI, llama.cpp server)
- Minimum tool surface: `Read`, `Edit`, `Write`, `Bash`
- Hybrid slash commands for `/build` and `/analyze`, with results appended to conversation history
- `security.shell` declaration schema, normalized through `normalize-security-policy.js`
- Permission evaluation with allow / prompt / deny outcomes
- In-memory session state
- Deterministic test coverage using a fake `Provider`
- Gated live tests for both providers
- Cancellation via Ctrl-C that preserves session well-formedness
- Config loading from `.ax/config.json` with env-var fallbacks

Out of scope for v0:

- Skill / plugin extension system
- Session persistence, resume, transcript export
- Remote execution of any kind (noted as future; no compatibility design work in v0)
- Additional tools: `Glob`, `Grep`, `NotebookEdit`, `WebFetch`, `WebSearch`, `Task` (subagents), etc.
- Additional slash commands beyond `/build` and `/analyze` (e.g. `/init`, `/fix`, `/debug`)
- Interactive diff approval UI beyond the existing prompt action
- Automatic context-window compaction
- Multi-session / multi-tab UI
- Rich history navigation (search, jump)

## Components

### `src/shell/`

| File | Purpose | Key surface |
|---|---|---|
| `index.js` | Entry point from `bin/ax.js`. Wires session + provider + agent loop + renderer, runs the REPL. | `startShell({ cwd, config, provider })` |
| `session.js` | Holds conversation state (messages, tool-call history, metadata). In-memory only. | `createSession()` → `{ messages, append, snapshot }` |
| `agent-loop.js` | Orchestrates one conversation turn: provider stream → parse tool_use → permission check → dispatch tool → feed tool_result back → loop until no more tool_use. | `runTurn(session, userInput, { provider, tools, onStream, onToolCall, signal })` |
| `tool-registry.js` | Registers v0 tools, produces provider-native tool schemas. | `buildToolRegistry()` → `{ schemas, dispatch(name, args) }` |
| `tools/read.js` | Read a file from disk. | `read({ path, offset?, limit? })` |
| `tools/edit.js` | String-replace in an existing file. Mirrors Claude Code's Edit semantics. | `edit({ path, old_string, new_string, replace_all? })` |
| `tools/write.js` | Write a file (overwrite or create). | `write({ path, content })` |
| `tools/bash.js` | Execute a shell command with a timeout. Streams stdout/stderr. | `bash({ command, timeout_ms?, cwd? })` |
| `slash-commands.js` | Parse `/command args…`. Dispatch to matching handler. Handlers call `src/cli/*-command.js` modules as functions and return structured results appended to session history. | `dispatchSlash(line, session) → { result, rendered }` |
| `permissions.js` | For each tool call, check against `definition.security.shell`. Returns `"allow" | "prompt" | "deny"`. | `checkPermission(toolName, args, policy)` |
| `render.js` | Terminal output: streaming assistant text, tool-call banners, diff preview for Edit/Write, command output framing. | `createRenderer({ stream })` |

### `src/providers/`

| File | Purpose | Key surface |
|---|---|---|
| `provider-interface.js` | Contract all providers implement. Streaming-first. | `Provider.stream({ messages, tools, model, signal }) → AsyncIterable<Event>` where `Event` is one of `{ kind: "text" \| "tool_use" \| "done" \| "error", ... }` |
| `anthropic-provider.js` | Wraps `@anthropic-ai/sdk`. Converts internal message shape to Anthropic Messages + tool_use blocks. | `createAnthropicProvider({ apiKey, defaultModel })` |
| `openai-compat-provider.js` | Wraps `openai` SDK with configurable `baseURL`. Covers OpenAI cloud + Ollama + LM Studio + vLLM + LocalAI + any OpenAI-compat endpoint. Converts tool_use ↔ OpenAI function-calling. | `createOpenAICompatProvider({ apiKey?, baseURL, defaultModel })` |
| `normalize.js` | Shared helpers for normalizing streaming events and tool-use across providers. | `normalizeToolCall(...)`, `normalizeDelta(...)` |

### Existing files modified

- `bin/ax.js`: add a "no subcommand" / `shell` dispatch that calls `startShell(...)`.
- `src/definition/recognized-sections.js`: add `security.shell` to the recognized schema.
- `src/security/normalize-security-policy.js`: normalize `security.shell` into a consistent internal policy shape that `permissions.js` reads.
- `src/index.js`: export the new shell + provider factories.
- `package.json`: add `@anthropic-ai/sdk` and `openai` to dependencies.

## Data Flow

### Startup

1. `bin/ax.js` dispatches to `startShell()`.
2. Read `.ax/config.json` (or env-var fallbacks) for provider choice, model, API keys / baseURL.
3. If an `.axiom.js` is discoverable in the cwd and declares `security.shell`, load its policy. If `.axiom.js` is absent, or `security` is absent, or `security.shell` is absent, apply built-in permissive defaults (`defaultAction: "allow"`, no per-tool overrides).
4. Instantiate `Provider`, `Session`, `ToolRegistry`, `Renderer`.
5. Drop into the REPL. Print a one-line readiness banner.

### Prose turn

```
User types prose → session.append(user message)
  ↓
agent-loop.runTurn():
  LOOP:
    provider.stream({ messages, tools, model, signal })
      → AsyncIterable<Event>
    For each event:
      • text    → render streaming to terminal
      • tool_use → buffer
      • done    → if no tool_use, EXIT LOOP
    For each completed tool_use:
      permissions.check(name, args, policy)
        • "allow"  → tool-registry.dispatch(name, args)
        • "prompt" → blocking Y/N in terminal
        • "deny"   → synthesize error tool_result
      session.append(assistant message with tool_use)
      session.append(tool_result)
    continue LOOP
  ↓
Turn complete. Prompt again.
```

### Slash-command turn

```
User types "/build foo.axiom.js"
  ↓
slash-commands.dispatchSlash(line, session):
  parse command + args
  directly call src/cli/build-command.js as a function (no subprocess)
  stream command output through render.js as it happens
  ↓
Capture structured result (healthReport, securityReport, verifications, diagnostics)
  ↓
session.append synthetic pair:
  • user message:       "/build foo.axiom.js"
  • assistant message:  structured content block summarizing the outcome
  ↓
No LLM call this turn. Prompt again.
  ↓
Next prose turn: the LLM sees the slash result in history and can answer
"why did verification X fail?" with full context.
```

### Cancellation

- Mid-stream (Ctrl-C once): abort the `AbortSignal` passed to the provider; provider closes the connection. Whole turn is discarded — no partial assistant text committed.
- Mid-tool: `SIGTERM` the running Bash child; pending tool calls in the turn are abandoned; session has the tool_use paired with a synthetic `"cancelled by user"` tool_result so history stays well-formed.
- Ctrl-C twice in rapid succession (<500ms): exit the shell cleanly.
- Ctrl-D at empty prompt: exit cleanly.

### Tool-result feedback

- Success: append `tool_result` block with content; loop.
- Error: append `tool_result` with `is_error: true` and the error message. Model decides whether to retry, try a different tool, or ask the user.

### Provider event contract

```
{ kind: "text",     delta: string }
{ kind: "tool_use", id: string, name: string, input: object }
{ kind: "done",     stopReason: "end_turn" | "tool_use" | "max_tokens" | ... }
{ kind: "error",    error: Error }
```

Each provider converts its native SSE/JSON stream into these events. The agent loop never sees provider-specific shapes.

## Error Handling

### Provider / network

| Condition | Behavior |
|---|---|
| Auth failure (401) | Fatal for the turn. `"Provider auth failed — check <env var>."` No retry spam. Return to REPL. |
| Rate limit (429) | Exponential backoff, ≤3 attempts. If still failing, surface `retry-after` to user. |
| Transient network / 5xx | Single retry with short delay. Then surface. Session alive. |
| Malformed tool-use args | Append `tool_result` with `is_error: true`. Model can self-correct. |

### Tool execution

| Tool | Error case | Behavior |
|---|---|---|
| Read | File not found / unreadable | `tool_result` with `is_error: true`, error message |
| Edit | `old_string` no match | Same |
| Edit | Matches multiple without `replace_all` | Same |
| Write | Path not writable | Same |
| Bash | Non-zero exit | **Not an error** — normal `tool_result` with `exitCode`, `stdout`, `stderr` |
| Bash | Timeout (default 2 min, configurable) | Kill child; `tool_result` with `timedOut: true`, partial stdout/stderr |
| Bash | Killed by signal | `tool_result` includes `signal` |

### Permission outcomes

- `"deny"`: `tool_result` with `is_error: true`, message `"Denied by security.shell policy: <rule>"`. Model chooses next step.
- `"prompt"` + user rejects: same synthesis, message `"User declined tool invocation."`
- `"allow"`: dispatch normally.

### Schema / startup validation

- Invalid `.axiom.js` `security.shell` → fail fast before REPL starts, print the normalization error.
- Unknown provider in config → fail fast.
- Missing API key for chosen provider → fail fast with the exact env var name to set.

### Context window exhaustion

- Surface the provider's length error as-is. v0 does not auto-compact. User can start a new session; automatic compaction is deferred.

### Slash command errors

- Internal exception from `src/cli/*-command.js` → capture, render error + stack, append to session so the LLM sees it on the next prose turn.
- Unknown command (`/foo`) → print `"Unknown command. Type /help"`. Do not modify session, do not call LLM.

### Invariant

After any error, the session stays well-formed: every tool_use has a matching tool_result so the next turn proceeds without tripping the provider on a dangling tool call.

## Testing

### Framework

Vitest (already in use). No new test runner.

### Deterministic unit tests

| Target | Approach |
|---|---|
| `provider-interface` + `normalize.js` | Round-trip fixtures: feed synthetic Anthropic-shaped and OpenAI-shaped responses through each provider's normalizer, assert the unified `Event` stream matches. No network. |
| `anthropic-provider.js` | Mock `@anthropic-ai/sdk`'s `messages.stream` with a scripted async iterable. Assert conversion to `Event` type. |
| `openai-compat-provider.js` | Mock `openai` SDK's `chat.completions.create(..., { stream: true })`. Same pattern. |
| `agent-loop.js` | `FakeProvider` returns scripted `Event` sequences. Assert session state, tool dispatch order, correct pairing of tool_use ↔ tool_result. Covers multi-step loops and interleaved text+tools. |
| `tools/*.js` | Filesystem fixtures under `test/fixtures/shell/`. Read/Edit/Write/Bash each verified against expected side effects. |
| `permissions.js` | Pure function on rule evaluation. Table-driven cases: allow / prompt / deny, glob patterns, tool-specific rules, fallback defaults. |
| `slash-commands.js` | Parse tests + dispatch with stubbed `src/cli/*-command.js`. Assert synthetic user/assistant pair lands in session. |
| `session.js` | Append / snapshot / well-formedness invariants. |
| `render.js` | Minimal snapshot tests (streaming chunk, tool banner, diff preview). |

### Deterministic integration tests

- Full conversation loop with fake provider: scripted multi-turn with tool_use, asserts session well-formedness end-to-end.
- Slash → prose: `/build` dispatch (stubbed build-command) → result in session → next prose turn's message array contains it.
- Cancellation invariants: fire `AbortSignal` mid-stream → no dangling tool_use → next turn succeeds.
- Permission paths: allow / prompt-accept / prompt-reject / deny, each producing the expected tool_result shape.

### Live / gated tests

- `test/providers/anthropic-provider.integration.test.js` — gated by `ANTHROPIC_API_KEY`. One small round-trip to `claude-sonnet-4-6` with a trivial tool call. Skipped by default.
- `test/providers/openai-compat-provider.integration.test.js` — gated by `OLLAMA_BASE_URL` or `OPENAI_API_KEY`. One round-trip to verify local + cloud both work through the same adapter.

### Explicitly not tested in v0

- Keystroke-level REPL interaction. The REPL is a thin wrapper around `runTurn(...)` which is fully testable programmatically.
- Terminal rendering fidelity beyond a few snapshots.
- Shell-driving-real-`ax-build` end-to-end. Slash command tests use stubbed `src/cli/*-command.js` imports; existing `ax build` tests cover build correctness.

## Acceptance Criteria

- `npm test` green, including all new shell + provider tests.
- `ANTHROPIC_API_KEY=... npm test` green, including the gated Anthropic live test.
- `OLLAMA_BASE_URL=http://localhost:11434/v1 npm test` green against a local Ollama, or `OPENAI_API_KEY=... npm test` green against OpenAI cloud, exercising the OpenAI-compat live test.
- Launching `ax` in any directory drops into a REPL with a readiness banner.
- From the REPL, a prose request like "open src/index.js and add a top-level comment" triggers Read → Edit tool calls, updates the file, and the LLM narrates the change.
- From the REPL, `/build examples/live-counter/counter-webapp.axiom.js` runs the existing build, streams output in the terminal, and the next prose turn can answer "what verifications ran?" from the synthetic history entry.
- An `.axiom.js` with `security.shell.tools.Bash: "deny"` prevents Bash execution with a clear error visible to the model and the user.
- Ctrl-C cancels the current turn; the next turn proceeds cleanly.

## Future Work (post-v0, not in scope)

- **Skill / extension system.** Third-party shell skills (slash commands, tools, prompt contributions). Plugin discovery, lifecycle, sandboxing.
- **Session persistence + resume.** `/resume <id>`, transcript export, history search.
- **Full tool surface.** `Glob`, `Grep`, `NotebookEdit`, `WebFetch`, `WebSearch`, `Task` (subagents for parallel work), `Monitor` (background process streaming).
- **More slash commands.** `/init`, `/fix`, `/debug`, `/help`, `/clear`, `/model` (swap provider mid-session).
- **Automatic context compaction.** Compact old turns before hitting the context window.
- **Remote execution control.** The shell as the control plane for dispatching builds to remote servers. Permission policy already accounts for the prompt-not-possible constraint.
- **Cross-LLM tool-use consistency.** As additional providers are added (Google Gemini, Bedrock, Vertex, etc.) beyond the Anthropic + OpenAI-compat pair, expand the `Provider` interface and normalization surface to keep tool-use behavior identical across backends.
- **Integration with external agent harnesses.** A "pass-through adapter" that lets Claude Code / Copilot CLI drive Axiom's agent loop without spawning a separate LLM subprocess. Complements the shell rather than competes with it.
- **Rich UX.** Multi-line paste buffers, inline syntax highlighting, interactive diff accept/reject, keybinding customization.

## Related Plans and Specs

- `docs/superpowers/specs/2026-04-14-new-mvp-security-design.md` — existing `security` schema this design extends
- `docs/superpowers/specs/2026-04-17-docker-build-security-design.md` — build isolation that the shell's `/build` reuses
- `docs/superpowers/plans/2026-04-03-axiom-post-mvp-backlog.md` — "second-wave priorities" (`ax init --query`, `ax debug`, richer `ax analyze`) that will be re-homed as shell skills rather than standalone subcommands
