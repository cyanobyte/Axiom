# Axiom Agent Instructions

<!-- Generated from .claude/skills/*/SKILL.md by scripts/build-skills.js. Do not edit by hand; run `npm run skills:build`. -->

## ax-intent

**When to use:** Use when the user wants to create, bootstrap, update, or refine an Axiom intent file (.axiom.js). Triggers include "ax-intent", "create .axiom.js", "update .axiom.js", "edit intent file", "refine axiom intent", "help me start an Axiom project", "turn this codebase into Axiom", "set up Axiom for this repo".

# When to use

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

- **`ax init` exits with `Usage: ax init --existing <path>`** → the CLI has no greenfield mode. Either create a `package.json` first and rerun with `--existing .`, or hand-author a starter `.axiom.js`.
- **`ax init --existing <path>` fails with ENOENT on `package.json`** → the target directory has no `package.json`. Offer to `npm init -y` first (with consent) or hand-author the file.
- **`ax init --existing` produces an incomplete file** → the starter is deliberately minimal. Read the file, explain what's missing, and offer to co-author `constraints`, `outcomes`, and `verification` based on what you can see in the repo.
- **User asks to update an existing `.axiom.js`** → read the file, propose the exact edit, and ask before changing it. Do not jump straight into editing.
- **User edits break the schema** → suggest running `ax analyze` via the `axiom-analyze` skill to get specific diagnostics rather than guessing.

## axiom-analyze

**When to use:** Use when the user wants to validate, lint, or pre-check an Axiom intent file without building it. Triggers include "analyze my intent file", "what's wrong with this .axiom.js", "before I build, check", "lint the axiom".

# When to use

Trigger this skill when the user wants a pre-build check of their `.axiom.js` — schema errors, readiness gaps, ambiguities, weak verification coverage — without actually running the build.

Do NOT trigger for actual builds (use the `axiom-build` skill) or for authoring a new file (use the `ax-intent` skill).

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

- **Analyzer reports a schema field the user hand-wrote and expected to be optional** → check the schema cheat sheet in the `ax-intent` skill. The analyzer is authoritative about what's recognized.
- **`ax: command not found` in Codex or another repo-local shell** → this repo exposes the CLI at `node bin/ax.js`. Use `node bin/ax.js analyze <target>` rather than stopping, and mention that it is the repo-local equivalent of `ax analyze`.
- **Suggestions look wrong** → don't force them. Explain the suggestion and let the user decide.
- **No `.axiom.js` in cwd** → ask the user where the file is. Do not invent a path.

## axiom-build

**When to use:** Use when the user wants to build an Axiom intent file or asks about build results. Triggers include "build this", "ax build", "run the axiom build", "did it pass", "build counter-webapp".

# When to use

Trigger this skill when the user:
- Asks to build a `.axiom.js` file ("build my intent file", "ax build this").
- Asks whether a build passed, succeeded, or verified correctly.
- Wants to see results, diagnostics, or generated files from a build.
- References a specific example, intent target, or build run.

Do NOT trigger for analysis (use the `axiom-analyze` skill) or security review (use the `axiom-security-review` skill).

# Instructions

1. Confirm the target file. If the user does not specify, check the local directory for `*.axiom.js` candidates with `ls *.axiom.js`. If there's exactly one, use it; if none or multiple, ask.
2. Run `ax build <target>` via Bash. `ax build` writes a mixed stream to stdout: zero or more progress lines like `[step] <id> started` / `[step] <id> passed`, followed by the final JSON result starting at the first line that is exactly `{`. Do NOT call `JSON.parse` on the entire stdout — slice from the first `{` line onward. The final object includes top-level `status`, `stepResults`, `events`, `verification`, `diagnostics`, `artifacts`, `finalValue`, `healthReport`, and (only when the intent declares a `security:` section) `securityReport`.
3. Parse the JSON result. Focus on:
   - `status` and `healthReport.status` — `"passed"` or `"failed"`.
   - `healthReport.steps` and `healthReport.verification` — total/passed/failed counts.
   - `verification` (singular, top-level array) — per-verification `status`, `severity`, `verificationId`, `covers`, `diagnostics`, `evidence`.
   - `diagnostics` — array of human-readable issues with `kind`, `message`, and `nextAction`.
   - `securityReport` — build/app security status. May be absent; see step 4.
4. If `securityReport` is present, summarize it briefly and offer the `axiom-security-review` skill for depth. If it is absent, say so — it means the intent didn't declare a `security:` section, not that security was skipped silently.
5. Render a short summary to the user: pass/fail, key counts, and anything that failed.
6. If anything failed, drill into the failure: cite the specific `verificationId` and `diagnostics` entry verbatim. Do NOT speculate about causes the JSON doesn't show.
7. Offer follow-up actions: fix the intent with the `ax-intent` skill, analyze with the `axiom-analyze` skill, or review security with the `axiom-security-review` skill.

# Output shape

`ax build <target>` exits 0 when the build ran to completion (verifications may still have failed; check `healthReport.status`). Non-zero exit indicates a build error (schema invalid, runtime exception, etc.) — different from a verification failure.

Key JSON paths:
- Top-level: `status`, `stepResults`, `events`, `verification`, `diagnostics`, `artifacts`, `finalValue`, `healthReport`, optionally `securityReport`.
- `healthReport.{status, steps.total, steps.passed, steps.failed, verification.total, verification.passed, verification.failed, generatedFiles}`.
- `verification[].{verificationId, kind, status, severity, covers, evidence, diagnostics}` — note this key is **singular** (`verification`), not `verifications`.
- `diagnostics[].{kind, message, nextAction}`.
- `securityReport.{build, app}` — present only when the intent declares `security:`. See the `axiom-security-review` skill for details.

# Common failure modes

- **Exit 0 but `healthReport.status: "failed"`** → the build ran but verifications failed. Summarize which ones and why.
- **Exit non-zero** → the CLI failed to even run the build. Report the stderr verbatim; don't pretend to know the cause.
- **`ax: command not found` in Codex or another repo-local shell** → this repo exposes the CLI at `node bin/ax.js`. Use `node bin/ax.js build <target>` rather than stopping, and mention that it is the repo-local equivalent of `ax build`.
- **`diagnostics` array non-empty** → surface the `message` and `nextAction` for each diagnostic. Don't paraphrase `nextAction`; quote it.
- **No `.axiom.js` in cwd** → ask the user where the file is. Do not invent a path.

## axiom-security-review

**When to use:** Use when the user wants to audit the security posture of a build or generated app, or tighten `security` declarations. Triggers include "audit this build", "is this safe", "security report", "tighten the security policy", "explain the security warnings".

# When to use

Trigger this skill when the user:
- Asks about security implications of a build or generated app.
- Wants to understand warnings in a `securityReport`.
- Wants help tightening `security.build`, `security.app`, or `security.shell` policy in `.axiom.js`.
- References security findings, policy violations, or compliance concerns.

Do NOT trigger for general build runs (use the `axiom-build` skill) or intent authoring (use the `ax-intent` skill).

# Instructions

1. Identify the most recent build. Preferred sources:
   - The user's immediately previous `ax build` invocation (check conversation history).
   - A `result.json` or equivalent artifact the user points at.
   - A fresh build if the user authorizes it.
2. Check whether the build's JSON has a top-level `securityReport` key. It is present only when the intent declared a `security:` section. If absent, stop here: tell the user the intent doesn't have security declarations, and offer to help add a `security: { build, app, shell }` block to the `.axiom.js` rather than inventing findings.
3. Read `securityReport` from the build's JSON output:
   - `securityReport.build.{mode, profile, status, warnings}` — how the build itself was sandboxed.
   - `securityReport.app.{target, profile, source, staticChecks, aiReview, finalStatus}` — how the generated app was audited.
4. Summarize findings grouped by severity:
   - `error` findings must be addressed before release.
   - `warning` findings should be reviewed.
   - Passed checks can be acknowledged briefly.
4. For each finding, cite the `ruleId`, `path` (if applicable), and `message` verbatim when those fields exist. Build-level warnings may only be plain strings under `securityReport.build.warnings`; quote the warning verbatim in that case. Suggest concrete tightening in `.axiom.js`:
   - `security.build.profile` changes if sandboxing is weak.
   - `security.app.profile` / `security.app.policy` changes if app behavior is flagged.
   - `security.app.violationAction` changes (`warn` → `break`) if the user wants enforcement.
   - `security.shell.tools` adjustments if shell-permission findings are flagged.
5. Do NOT modify the intent file without explicit user approval.

# Output shape

`securityReport.build.status` is `"pass"` or `"fail"`. `securityReport.app.finalStatus` is one of `"pass"`, `"warning"`, or `"failed"` depending on `staticChecks`, `aiReview`, and the intent's `violationAction`.

Key JSON paths:
- `securityReport.build.{mode, profile, status, warnings}`.
- `securityReport.app.staticChecks.findings[].{ruleId, severity, path, message}`.
- `securityReport.app.aiReview.{status, findings}`.
- `securityReport.app.finalStatus`.

# Common failure modes

- **Report absent because no build has run yet** → offer to invoke the `axiom-build` skill.
- **Report absent even though a build ran** → the intent doesn't declare a `security:` section, so the runtime produces no report (`createSecurityReport(undefined)` returns `undefined`). Do NOT invent findings. Offer to help add a `security:` block to the `.axiom.js` and rebuild.
- **Build warning with no `ruleId`/`path`** → some build-level findings are plain warning strings under `securityReport.build.warnings` rather than structured app findings. Quote the warning as-is and explain that it describes build sandbox posture, not generated-app code.
- **`finalStatus: "warning"`** → the app passed with non-blocking findings. Explain each; let the user decide whether to tighten `violationAction` to `"break"`.
- **AI review unavailable** (`aiReview.status: "not-run"`) → explain that the AI security review did not execute (typically because no AI adapter was configured); the static findings still apply.
- **Finding on test/verification code** (e.g., a `scripts/verify-*.js` path) — this is a known product gap: the app audit does not distinguish runtime code from test code. Explain this limitation; suggest the user treat such findings as reviewer judgment calls rather than hard blockers.
