---
name: axiom-authoring
description: Use when the user wants to create, bootstrap, or refine an Axiom intent file (.axiom.js). Triggers include "help me start an Axiom project", "write an intent file", "turn this codebase into Axiom", "set up Axiom for this repo".
---

# When to use

Trigger this skill when the user:
- Is starting a new Axiom project from scratch ("create a new Axiom project", "I want to use Axiom for X").
- Wants to bring Axiom into an existing codebase ("set up Axiom for this repo", "turn this into an Axiom project").
- Asks for help refining or extending an existing `.axiom.js` file.
- References intent authoring, intent sections, or the Axiom schema.

Do NOT trigger for actual builds (use the `axiom-build` skill) or for analysis (use the `axiom-analyze` skill).

# Instructions

## Greenfield projects

1. Ask what the user wants to build in one short question (capability, target platform). Offer concrete examples if they're unsure.
2. Run `ax init --help` via Bash to confirm the available flags for the installed version.
3. Run `ax init` in the target directory. The CLI produces a starter `.axiom.js` and prints guidance.
4. Read the produced file. Explain each section in one sentence. Offer to tailor it.

## Existing codebases

1. Confirm the user is in the existing project directory.
2. Run `ax init --existing .` — the CLI inspects package.json, existing source, and emits a starter `.axiom.js` based on what it detects.
3. Read the produced file. Highlight:
   - What the CLI inferred correctly.
   - What needs human judgment (scope boundaries, quality attributes, constraints).

## Iteration

After the starter file is in place, use the `axiom-analyze` skill to surface schema issues, readiness gaps, and weak verification. Offer to apply `ax fix` suggestions when appropriate.

## Schema cheat sheet

Required top-level sections (standard mode):
- `id`, `meta` (title/summary/version), `what` (capability/description).
- `why` (problem/value), `scope` (includes/excludes), `runtime` (languages/targets/platforms).
- `constraints` (array of `must(...)`), `outcomes` (array of `outcome(...)`).
- `verification` ({ intent, outcome }).

Optional but common:
- `build`, `architecture`, `policies`, `quality_attributes`, `security`.
- One domain section: `web`, `cli`, `service`, `library`, `desktop`, `mobile`.

Compact mode: for tiny self-explanatory projects, only `meta`, `what`, `runtime`, and one domain section are needed. The runtime expands compact definitions internally.

# Output shape

`ax init` writes a `.axiom.js` file to the target directory plus a short stdout message describing what was created. Read the file before discussing it with the user; never invent fields that aren't in the schema.

# Common failure modes

- **`ax init` refuses because the directory is not empty** → explain the constraint; recommend `ax init --existing .` if the user meant "bootstrap from this existing codebase."
- **`ax init --existing` produces an incomplete file** → read the file, explain what's missing, and offer to co-author the gaps based on what you can see in the repo.
- **User edits break the schema** → suggest running `ax analyze` via the `axiom-analyze` skill to get specific diagnostics rather than guessing.
