---
name: axiom-analyze
description: Use when the user wants to validate, lint, or pre-check an Axiom intent file without building it. Triggers include "analyze my intent file", "what's wrong with this .axiom.js", "before I build, check", "lint the axiom".
---

# When to use

Trigger this skill when the user wants a pre-build check of their `.axiom.js` — schema errors, readiness gaps, ambiguities, weak verification coverage — without actually running the build.

Do NOT trigger for actual builds (use the `axiom-build` skill) or for authoring a new file (use the `axiom-authoring` skill).

# Instructions

1. Identify the target file. If not specified and there's exactly one `*.axiom.js` in cwd, use it. If multiple or none, ask.
2. Run `ax analyze <target>` via Bash.
3. Parse the JSON result:
   - `errors` — blocking issues that will prevent a build or verification from working.
   - `warnings` — things the user should know about but that won't block a build.
   - `suggestions` — improvements proposed by the analyzer (may correspond to `ax fix` actions).
4. Render findings grouped by severity. For each: cite the `section` and `kind`, explain what the analyzer flagged, and quote `nextAction` verbatim.
5. If suggestions are safe and mechanical, offer to apply them via `ax fix <file> --apply <id>` (the finding's top-level `id` is the fix id). If they require judgment, walk the user through them.
6. Do NOT silently modify the intent file. `ax analyze` is read-only by design.

# Output shape

`ax analyze` exits 0 when `status === "passed"` (no errors; warnings/suggestions are non-blocking). Non-zero exit means at least one error. Top-level keys: `status` (`"passed"` or `"invalid"`), `targetFile`, `errors`, `warnings`, `suggestions`.

Key JSON paths:
- `errors[].{kind, section, message, nextAction}`. Fix-driven entries also include `id` and `fix: { type, label }`.
- `warnings[].{kind, section, message, nextAction}` plus optional `id` and `fix` as above.
- `suggestions[].{kind, section, message, nextAction}` plus optional `id` and `fix` as above. There is no `field` or `proposedFix` key — those names are not produced by the analyzer.

# Common failure modes

- **Analyzer reports a schema field the user hand-wrote and expected to be optional** → check the schema cheat sheet in the `axiom-authoring` skill. The analyzer is authoritative about what's recognized.
- **Suggestions look wrong** → don't force them. Explain the suggestion and let the user decide.
- **No `.axiom.js` in cwd** → ask the user where the file is. Do not invent a path.
