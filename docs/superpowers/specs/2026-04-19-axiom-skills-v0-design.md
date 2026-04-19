# Axiom Skills v0 Design

## Goal

Ship four authored skills that let developers drive Axiom conversationally from Claude Code and Codex, invoking the existing `ax` CLI through each host's built-in Bash tool. Skills are pure markdown: no new runtime code, no MCP server, no packaging overhead. A small generator keeps a repo-root `AGENTS.md` in sync with the source-of-truth `.claude/skills/*.md` files so Codex users get the same guidance without hand-duplication.

This is the "skills-first" alternative to the shelved `2026-04-18-axiom-shell-v0-design.md`. The shell spec is preserved for future work; this spec replaces it as the near-term v0.

## Motivation

The cheapest way to validate whether a conversational Axiom experience has demand is to ship it inside the agent tools developers already use. Claude Code's skill system and Codex's `AGENTS.md` mechanism both support always-available guidance for the LLM, and both hosts already expose a Bash tool capable of running `ax build`, `ax analyze`, etc. A native shell would cost months to build and retain users only if usage demand justifies it. Skills cost days, reach users immediately, and keep the option open to build a shell later with actual signal.

A second benefit: the `ax` CLI is already a good Axiom source-of-truth. It emits JSON output, has clear help text, and runs deterministically. Wrapping it in instruction markdown keeps the runtime surface narrow and the iteration loop fast.

## Source Shape — Skill File Format

Each skill lives at `.claude/skills/<name>.md` and follows Claude Code's native skill shape:

```markdown
---
name: axiom-build
description: Use when the user wants to build an Axiom intent file. Triggers include "build this", "ax build", "does it pass", "run the axiom build".
---

# When to use

<prose for the LLM describing triggering scenarios in more detail than the frontmatter>

# Instructions

<step-by-step guidance: which `ax` command to run, how to parse output, how to render results>

# Output shape

<reference for the JSON fields the CLI emits so the LLM can explain them>

# Common failure modes

<what to do when the command fails, when verification reports errors, etc.>
```

The frontmatter must provide `name` and `description`. Body sections are conventional markdown; the exact headings above are recommendations, not requirements.

## Scope

In scope:

- Four skill files under `.claude/skills/`:
  - `axiom-authoring` — co-author a new `.axiom.js` file (greenfield via `ax init`, existing-project via `ax init --existing .`)
  - `axiom-build` — run `ax build`, parse the JSON result, summarize health + verification + security
  - `axiom-analyze` — run `ax analyze`, interpret diagnostics, suggest fixes
  - `axiom-security-review` — read the latest build's `securityReport` and guide policy tightening
- A repo-root `AGENTS.md` generated from the skill files for Codex consumption
- `scripts/build-skills.js` generator with `--check` mode
- `npm run skills:build` and `npm run skills:check` package scripts
- Vitest coverage of the generator (parse, assemble, write, check, error paths)
- `npm test` integration that runs `skills:check` so drift is caught in the default suite
- A manual smoke checklist (`docs/skills-smoke-checklist.md`) an author walks once per skill in both hosts after substantive edits
- README update documenting the author workflow and the two skill-related npm scripts

Out of scope for v0:

- MCP server for Axiom
- Claude Code plugin packaging for external distribution (a marketplace publish)
- Codex-specific MCP wiring or `~/.codex/config.toml` changes
- Additional skills beyond the four named above (`ax fix`, `ax debug`, a generated-app inspector, etc.)
- Cursor, Zed, Gemini CLI, or any other host beyond Claude Code + Codex
- Pre-commit hook enforcement of `skills:check`
- Automated LLM-behavior regression tests
- New CLI flags or output format changes to support skills

## Architecture Overview

**Core shape:** Claude Code skill files are the source of truth. A small generator reads them and assembles `AGENTS.md` at the repo root. Both outputs are committed. Users cloning the repo get working skills in Claude Code and Codex with no build step.

**Layout:**

```
<repo>/
├── .claude/skills/              ← source of truth, Claude Code-ready
│   ├── axiom-authoring.md
│   ├── axiom-build.md
│   ├── axiom-analyze.md
│   └── axiom-security-review.md
├── AGENTS.md                    ← generated from .claude/skills/*.md
├── scripts/
│   └── build-skills.js          ← generator + --check mode
├── docs/
│   └── skills-smoke-checklist.md ← manual smoke checklist for authors
└── package.json                 ← skills:build / skills:check scripts
```

Why this shape:

- Single editing surface (the `.md` files) — no neutral intermediate format to maintain
- One-way generation (Claude Code → Codex), not a fan-out from a third format
- CI/test check keeps `AGENTS.md` honest without requiring users to run the generator
- Deleting the generator later loses nothing — the Claude Code files stand alone

## Components

### New files

| File | Purpose |
|---|---|
| `.claude/skills/axiom-authoring.md` | Guide the LLM through co-authoring a `.axiom.js` file. Includes schema cheat sheet, compact vs. full mode guidance, when to run `ax init` vs. `ax init --existing`, and how to iterate with `ax analyze`. |
| `.claude/skills/axiom-build.md` | Instruct the LLM to run `ax build`, parse the JSON result, summarize verification + health + security outcomes, and guide follow-ups when verification fails. |
| `.claude/skills/axiom-analyze.md` | Instruct the LLM to run `ax analyze`, interpret warnings/errors, and suggest `ax fix` or manual edits. |
| `.claude/skills/axiom-security-review.md` | Instruct the LLM to read the latest build's `securityReport`, summarize findings by severity, and walk the user through tightening `security.build` / `security.app` / `security.shell`. |
| `AGENTS.md` | Generated. Top-level Codex instructions file assembled from the four skill files. One section per skill. Always-on context for any Codex session run in the repo. |
| `scripts/build-skills.js` | Generator. Reads `.claude/skills/*.md`, extracts frontmatter + body, assembles `AGENTS.md`. Supports `--check` for CI verification. |
| `docs/skills-smoke-checklist.md` | Manual smoke checklist: prompts + expected behavior per skill, run in both Claude Code and Codex after substantive edits. |
| `test/skills/build-skills.test.js` | Unit tests for the generator (parsing, assembly, check mode, error paths). |
| `test/fixtures/skills/valid/` | Fixture skill files exercising valid cases. |
| `test/fixtures/skills/invalid-*/` | Fixture directories exercising error paths (missing frontmatter, malformed YAML, duplicate names). |

### Generator contract

`scripts/build-skills.js`:

- **Default invocation:** reads every file matching `.claude/skills/*.md`, parses YAML frontmatter + body, sorts by filename (deterministic), writes `AGENTS.md` atomically at the repo root.
- **`--check`:** runs the same generation in memory, compares against on-disk `AGENTS.md`, exits 0 if identical, exits 1 with a unified diff if drifted.
- **Validation:** each skill must have frontmatter with `name` and `description`. Missing, empty, duplicate, or malformed frontmatter fails loudly with the offending file path. Invalid frontmatter never writes a partial `AGENTS.md`.

### AGENTS.md shape

```markdown
# Axiom Agent Instructions

<header identifying the file as generated from .claude/skills/ — "do not edit by hand; run npm run skills:build">

## axiom-authoring

**When to use:** <description from frontmatter>

<body of the skill>

## axiom-build

...
```

### Package.json additions

```json
"scripts": {
  "skills:build": "node scripts/build-skills.js",
  "skills:check": "node scripts/build-skills.js --check"
}
```

## Data Flow

### Author workflow

```
edit .claude/skills/<name>.md
  ↓
npm run skills:build
  ↓
generator rebuilds AGENTS.md
  ↓
git add .claude/skills/<name>.md AGENTS.md
git commit
```

### Claude Code user workflow

```
user prompt → Claude Code matches skill by frontmatter description
  ↓
skill body injected into conversation
  ↓
LLM follows instructions: invokes `ax <command>` via built-in Bash tool
  (user-gated per the repo's existing .claude/settings permissions)
  ↓
LLM parses JSON stdout from the CLI
  ↓
LLM renders summary to user in natural language
  ↓
follow-ups work because skill content and CLI output are both in conversation history
```

### Codex user workflow

```
codex starts in the Axiom repo
  ↓
AGENTS.md loaded as persistent context for every turn
  ↓
user prompt
  ↓
LLM sees all skill guidance always-on, chooses whether an Axiom CLI command applies
  ↓
LLM invokes `ax <command>` via its shell tool
  ↓
same parse + render + follow-up pattern as Claude Code
```

### Generator (`skills:build`) flow

```
read .claude/skills/*.md (glob, sorted by filename for determinism)
  ↓
for each file:
  - parse YAML frontmatter (require `name` + `description`)
  - split body from frontmatter
  ↓
assemble AGENTS.md:
  - static header ("Axiom Agent Instructions" + "generated from .claude/skills/; do not edit by hand")
  - for each skill: "## <name>" + "**When to use:** <description>" + body
  ↓
write AGENTS.md atomically (temp file + rename)
```

### CI check (`skills:check`) flow

```
run generator in memory → produce expected AGENTS.md string
  ↓
read committed AGENTS.md
  ↓
compare byte-for-byte:
  - identical → exit 0
  - drifted → print unified diff, exit 1 with:
    "AGENTS.md is out of date. Run `npm run skills:build` and commit."
```

### Invariants

- Both outputs (`.claude/skills/*.md` and `AGENTS.md`) are committed.
- Generator is pure: same input → same output. Sorted filename ordering avoids developer-to-developer churn.
- Skills speak one voice: each body works unchanged in both hosts; no conditional blocks.
- CLI is the only runtime moving part. The skill system has no runtime of its own.

## Error Handling

### Generator errors (`skills:build`)

| Condition | Behavior |
|---|---|
| Skill file missing required frontmatter (`name` or `description`) | `ERROR: <path>: missing required field '<field>'`. Exit 1. No partial write. |
| Frontmatter YAML parse failure | `ERROR: <path>: invalid frontmatter YAML: <detail>`. Exit 1. |
| Duplicate `name` across two skill files | `ERROR: duplicate skill name "<name>" in <path1> and <path2>`. Exit 1. |
| Write to `AGENTS.md` fails (disk full, permission denied) | `ERROR: could not write AGENTS.md: <detail>`. Exit 1. No partial file (atomic temp-write + rename). |
| No skill files found | Warn and write an `AGENTS.md` containing only the header. Exit 0. |

### CI check errors (`skills:check`)

| Condition | Behavior |
|---|---|
| `AGENTS.md` matches generated output | Exit 0, one-line `ok`. |
| `AGENTS.md` missing | `ERROR: AGENTS.md not found. Run 'npm run skills:build' to create it.` Exit 1. |
| `AGENTS.md` drifts | Print unified diff. Exit 1 with `AGENTS.md is out of date. Run 'npm run skills:build' and commit the result.` |
| Generator error (from above table) | Same failure as `skills:build`; check mode does not mask upstream errors. |

### Runtime skill failures (authored into skill body, not system-level)

Each skill body includes a "Common failure modes" section instructing the LLM how to react when the CLI reports an error. Examples:

- `ax build` exits non-zero → surface the last failed step and `diagnostics` array from the health report; do not retry blindly.
- Verification fails → explain the `verifications` array's structure and direct the user to the specific failed `verificationId`.
- `ax analyze` reports schema errors → translate into concrete `.axiom.js` edits.
- Missing `.axiom.js` in cwd → ask the user where the intent file lives rather than guessing.

### Host-level permission denials

- Claude Code user denies the Bash tool → skill body instructs the LLM to explain the intended command and why, and let the user retry after updating `.claude/settings.local.json`.
- Codex restricts shell tool → same pattern; skill body stays host-neutral.

### Drift-prevention invariants

- `npm run skills:check` must run cleanly before any commit that touches `.claude/skills/` or `AGENTS.md`.
- The README's skills section documents the author workflow.
- `npm test` includes `skills:check` so drift is caught without separate CI wiring.

## Testing

### Framework

Vitest (already in use). No new test runner.

### Deterministic unit tests

| Target | Approach |
|---|---|
| `scripts/build-skills.js` — parse | Fixtures under `test/fixtures/skills/` covering valid, missing-frontmatter, malformed-YAML, and duplicate-name cases. Assert the parser extracts `name`, `description`, and body correctly. |
| `scripts/build-skills.js` — assemble | Feed a known set of parsed skills into the assembler; snapshot the resulting `AGENTS.md` string. Verify static header, stable filename ordering, one section per skill, correct description + body per section. |
| `scripts/build-skills.js` — write mode | Point the generator at a tmp input directory and tmp output path; run it; read back the written `AGENTS.md`; compare to snapshot. Verify atomic semantics (no partial file if write is interrupted). |
| `scripts/build-skills.js` — check mode | (1) committed `AGENTS.md` matches what the generator would produce → exit 0, no stdout noise. (2) committed `AGENTS.md` drifts → exit 1, unified diff on stdout, clear remediation message. |
| Error paths | For each failure from the generator-error table above: assert correct error message, correct exit code, no partial file written. |

### Integration check

- After the generator is in place, run `npm run skills:build` once with the four real skill files. Commit the resulting `AGENTS.md`. Then run `npm run skills:check` — must exit 0.
- Add a Vitest test that spawns `node scripts/build-skills.js --check` and asserts exit code 0. This runs on every `npm test` so drift is caught without separate CI wiring.

### Skill-behavior testing (manual)

Skill behavior is LLM behavior and isn't deterministic. `docs/skills-smoke-checklist.md` lists short prompt-by-expected-behavior entries per skill, walked once in Claude Code and once in Codex after substantive edits:

- `axiom-authoring` — Claude Code: "help me start an Axiom project for a counter web app." Expected: LLM proposes running `ax init`, offers schema options, drafts a starter `.axiom.js`, explains compact vs. full mode.
- `axiom-build` — Claude Code: "build `examples/live-counter/counter-webapp.axiom.js`." Expected: LLM invokes `ax build <path>`, summarizes health report, flags verification failures if any, offers to drill in.
- `axiom-analyze` — Claude Code: point at an intentionally broken intent file. Expected: LLM runs `ax analyze`, translates warnings into concrete fixes.
- `axiom-security-review` — Claude Code: after a successful build that flagged warnings. Expected: LLM reads the `securityReport`, categorizes findings, recommends concrete tightening.

Each entry is then repeated in Codex (`codex` CLI invoked in the repo) to confirm the generated `AGENTS.md` produces equivalent behavior.

### Explicitly not tested in v0

- LLM output quality / whether a skill's guidance produces "good" generated intent files — judged by the author during manual smoke.
- Host-specific triggering quirks (Claude Code's skill-match threshold, Codex context truncation). Covered as the smoke checklist evolves.
- Regression testing across model upgrades. Skills are treated as living documents; reviewers update them as models change.

## Acceptance Criteria

- `npm run skills:build` reads the four real skill files and produces `AGENTS.md` with no drift after running.
- `npm run skills:check` exits 0 on a clean tree. Introducing drift (change a description in a skill file without running `skills:build`) causes it to exit 1 with a readable diff.
- `npm test` includes the generator's unit tests and the check-mode integration test; full suite green.
- The manual smoke checklist has been walked once per skill in both Claude Code and Codex before merging.
- The repo root contains an `AGENTS.md` that Codex automatically loads on startup.
- The README documents how to author a new skill, how to regenerate `AGENTS.md`, and which npm scripts are available.

## Future Work (post-v0)

- **Additional skills.** `axiom-fix`, `axiom-debug`, `axiom-generated-app-inspector`, `axiom-init-query` (interactive new-project bootstrap). Each follows the same file format and gets added to the generated `AGENTS.md`.
- **Cursor / Zed / Gemini CLI support.** Add per-host wrapper formats to the generator. Cursor has its own rules/instructions format; Zed reads `.zed/rules.md`; Gemini has `GEMINI.md`. Each is a small addition to the generator.
- **Pre-commit hook.** Enforce `skills:check` automatically on commits that touch `.claude/skills/` or `AGENTS.md`.
- **Claude Code plugin packaging.** Publish the skill bundle for users who don't clone the Axiom repo.
- **MCP server.** If the skill set grows past ~10 and Codex context bloat becomes measurable, expose the same capabilities via an MCP server that both hosts consume natively. The skill files become thin pointers to the MCP tools.
- **The shell.** The deferred `2026-04-18-axiom-shell-v0-design.md` remains available. Usage signal from these skills informs whether and when to pick it up.
- **Automated skill-behavior testing.** Structured evaluation harness that runs the smoke checklist through an LLM and asserts key behaviors, caught in CI.

## Related Plans and Specs

- `docs/superpowers/specs/2026-04-18-axiom-shell-v0-design.md` — the shelved native-shell alternative
- `docs/superpowers/plans/2026-04-03-axiom-post-mvp-backlog.md` — second-wave items that may become skills later (`ax init --query`, `ax debug`)
- `docs/superpowers/specs/2026-04-14-new-mvp-security-design.md` — the `security` policy surface that `axiom-security-review` reads
