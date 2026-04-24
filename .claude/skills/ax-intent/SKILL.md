---
name: ax-intent
description: Use when the user wants to create, bootstrap, update, or refine an Axiom intent file (.axiom.js). Triggers include "ax-intent", "create .axiom.js", "update .axiom.js", "edit intent file", "refine axiom intent", "help me start an Axiom project", "turn this codebase into Axiom", "set up Axiom for this repo".
---

# When to use

This skill is the controlling workflow for concrete Axiom intent-file requests. In Codex environments that also load generic process skills, follow this skill directly instead of detouring into generic brainstorming or visual-companion prompts when the user has already asked for a specific `.axiom.js` creation or update task.

Trigger this skill when the user:
- Explicitly says `ax-intent` or asks to create/update/edit an Axiom intent file.
- Is starting a new Axiom project from scratch ("create a new Axiom project", "I want to use Axiom for X").
- Wants to bring Axiom into an existing codebase ("set up Axiom for this repo", "turn this into an Axiom project").
- Asks for help refining or extending an existing `.axiom.js` file ("update this .axiom.js", "edit the intent file", "add security to this intent").
- References intent authoring, intent sections, or the Axiom schema.

Do NOT trigger for actual builds (use the `axiom-build` skill) or for analysis (use the `axiom-analyze` skill).

# Instructions

## CLI capability

`ax init` has exactly one mode: `ax init --existing <path>`. It requires a `package.json` in `<path>`. There is no bare/greenfield `ax init` — running it without `--existing` exits 1 with `Usage: ax init --existing <path>`.

## First-turn routing

Route quickly into one of these paths:

- **Create path** when the user wants to start a project, bootstrap Axiom in a repo, or create a new `.axiom.js`.
- **Update path** when the user already has a `.axiom.js` and wants to revise it.

Do not blend the two paths into a generic brainstorming response. The first reply should move directly toward either producing a starter file or inspecting the existing one.
Do not offer a visual companion or browser-based mockup flow for these requests. The task is intent authoring, not visual design.

## Create path

Use this path for greenfield projects and existing codebases that do not yet have an Axiom intent file.

### Greenfield projects (no package.json yet)

1. Ask what the user wants to build in one short question (capability, target platform). Offer concrete examples if they're unsure.
2. Ask (or confirm) that the user wants a `package.json` created first. If yes, run `npm init -y` in the target directory — `ax init` needs it.
3. Run `ax init --existing .` in the target directory. The CLI produces a starter `.axiom.js` based on the `package.json` it just read.
4. Read the produced file. Explain each section in one sentence. Offer to tailor it — the starter is minimal and most intents need meaningful `constraints`, `outcomes`, and `verification` added by hand.

If the user does NOT want a `package.json`, hand-author a minimal `.axiom.js` using the schema cheat sheet below rather than running any CLI.

### Existing codebases

1. Confirm the user is in the existing project directory and it has a `package.json`.
2. Run `ax init --existing .` — the CLI reads `package.json`, checks for a `public/` directory and an `express` dependency to pick `web` vs. `library`, and emits a starter `.axiom.js`.
3. Read the produced file. Highlight:
   - What the CLI inferred correctly (title, test command, domain guess).
   - What needs human judgment (scope boundaries, quality attributes, constraints, verification).

## Update path

Use this path when a `.axiom.js` already exists and the user wants to change it.

1. Read the existing intent file before proposing edits.
2. Summarize the current shape briefly in terms of the sections relevant to the user's request.
3. Propose the concrete edits you would make, tied to the user's goal (for example: add a `security` block, tighten `constraints`, refine `verification`, narrow `scope`).
4. Ask for approval before modifying the file.
5. After approval, make the agreed edit and then offer `ax analyze` to validate it.

When the request is straightforward, keep the proposal short and concrete. Do not stay advisory longer than needed, but do not silently modify the intent file.

## Iteration

After the starter file is in place, use the `axiom-analyze` skill to surface schema issues, readiness gaps, and weak verification. Offer to apply `ax fix` suggestions when appropriate.

## Schema cheat sheet

`ax analyze` is authoritative about what's actually required. Don't claim a field is required just because it appears below — the analyzer will tell you.

Commonly present top-level sections:
- `id`, `meta` (title/summary/version), `what` (capability/description).
- `why` (problem/value), `scope` (includes/excludes), `runtime` (languages/targets/platforms).
- `constraints` (array of `must(...)`), `outcomes` (array of `outcome(...)`).
- `verification` ({ intent, outcome }).
- `build`, `architecture`, `policies`, `quality_attributes`, `security`.
- One domain section: `web`, `cli`, `service`, `library`, `desktop`, `mobile`.

Verified-minimum: the `what` section itself must exist; `ax analyze` rejects intents without it. Sub-fields within `what` (like `capability`) are not individually required by the analyzer.

Compact mode: for tiny self-explanatory projects, a small subset (typically `meta`, `what`, `runtime`, and one domain section) is enough. The runtime expands compact definitions internally.

# Output shape

`ax init --existing <path>` writes `<projectName>.axiom.js` into `<path>` and prints two stdout lines: `Wrote starter intent file: ...` and a next-step hint pointing at `ax analyze`. Read the file before discussing it with the user; never invent fields that aren't in the schema.

# Common failure modes

- **Codex detours into generic brainstorming or offers a visual companion before handling the intent request** → treat `ax-intent` as the higher-priority workflow for concrete `.axiom.js` create/update requests. Skip the generic brainstorming and visual-companion path; ask the shortest question needed to proceed with create or update routing.
- **`ax init` exits with `Usage: ax init --existing <path>`** → the CLI has no greenfield mode. Either create a `package.json` first and rerun with `--existing .`, or hand-author a starter `.axiom.js`.
- **`ax init --existing <path>` fails with ENOENT on `package.json`** → the target directory has no `package.json`. Offer to `npm init -y` first (with consent) or hand-author the file.
- **`ax init --existing` produces an incomplete file** → the starter is deliberately minimal. Read the file, explain what's missing, and offer to co-author `constraints`, `outcomes`, and `verification` based on what you can see in the repo.
- **User asks to update an existing `.axiom.js`** → read the file, propose the exact edit, and ask before changing it. Do not jump straight into editing.
- **User edits break the schema** → suggest running `ax analyze` via the `axiom-analyze` skill to get specific diagnostics rather than guessing.
