# Axiom Agent Instructions

<!-- Generated from .claude/skills/*.md by scripts/build-skills.js. Do not edit by hand; run `npm run skills:build`. -->

## axiom-analyze

**When to use:** Use when the user wants to validate, lint, or pre-check an Axiom intent file without building it. Triggers include "analyze my intent file", "what's wrong with this .axiom.js", "before I build, check", "lint the axiom".

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
4. Render findings grouped by severity. For each: cite the exact location (section, field), explain what the analyzer flagged, and quote any `nextAction` verbatim.
5. If suggestions are safe and mechanical, offer to apply them via `ax fix`. If they require judgment, walk the user through them.
6. Do NOT silently modify the intent file. `ax analyze` is read-only by design.

# Output shape

`ax analyze` exits 0 when no errors exist (warnings/suggestions are non-blocking). Non-zero exit means at least one error.

Key JSON paths:
- `errors[].{section, field, message, nextAction}`.
- `warnings[].{section, field, message, nextAction}`.
- `suggestions[].{section, field, message, proposedFix}`.

# Common failure modes

- **Analyzer reports a schema field the user hand-wrote and expected to be optional** → check the schema cheat sheet in the `axiom-authoring` skill. The analyzer is authoritative about what's recognized.
- **Suggestions look wrong** → don't force them. Explain the suggestion and let the user decide.
- **No `.axiom.js` in cwd** → ask the user where the file is. Do not invent a path.

## axiom-authoring

**When to use:** Use when the user wants to create, bootstrap, or refine an Axiom intent file (.axiom.js). Triggers include "help me start an Axiom project", "write an intent file", "turn this codebase into Axiom", "set up Axiom for this repo".

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
2. Run `ax build <target>` via Bash. Build output is streamed; the final JSON result includes a health report, verifications, diagnostics, security report, artifacts, and any final value returned by the intent's runFn.
3. Parse the JSON result. Focus on:
   - `healthReport.status` — `"passed"` or `"failed"`.
   - `healthReport.steps` and `healthReport.verification` — total/passed/failed counts.
   - `verifications` — per-verification `status` and `severity`.
   - `diagnostics` — array of human-readable issues with `kind` and `nextAction`.
   - `securityReport` — build/app security status.
4. Render a short summary to the user: pass/fail, key counts, and anything that failed.
5. If anything failed, drill into the failure: cite the specific `verificationId` and `diagnostics` entry verbatim. Do NOT speculate about causes the JSON doesn't show.
6. Offer follow-up actions: fix the intent with the `axiom-authoring` skill, analyze with the `axiom-analyze` skill, or review security with the `axiom-security-review` skill.

# Output shape

`ax build <target>` exits 0 when the build ran to completion (verifications may still have failed; check `healthReport.status`). Non-zero exit indicates a build error (schema invalid, runtime exception, etc.) — different from a verification failure.

Key JSON paths:
- `healthReport.{status, steps.total, steps.passed, steps.failed, verification.total, verification.passed, verification.failed, generatedFiles}`.
- `verifications[].{verificationId, status, severity, covers, diagnostics}`.
- `diagnostics[].{kind, message, nextAction}`.
- `securityReport.{build, app}` — see the `axiom-security-review` skill for details.

# Common failure modes

- **Exit 0 but `healthReport.status: "failed"`** → the build ran but verifications failed. Summarize which ones and why.
- **Exit non-zero** → the CLI failed to even run the build. Report the stderr verbatim; don't pretend to know the cause.
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

Do NOT trigger for general build runs (use the `axiom-build` skill) or intent authoring (use the `axiom-authoring` skill).

# Instructions

1. Identify the most recent build. Preferred sources:
   - The user's immediately previous `ax build` invocation (check conversation history).
   - A `result.json` or equivalent artifact the user points at.
   - A fresh build if the user authorizes it.
2. Read `securityReport` from the build's JSON output:
   - `securityReport.build.{mode, profile, status, warnings}` — how the build itself was sandboxed.
   - `securityReport.app.{target, profile, source, staticChecks, aiReview, finalStatus}` — how the generated app was audited.
3. Summarize findings grouped by severity:
   - `error` findings must be addressed before release.
   - `warning` findings should be reviewed.
   - Passed checks can be acknowledged briefly.
4. For each finding, cite the `ruleId`, `path` (if applicable), and `message` verbatim. Suggest concrete tightening in `.axiom.js`:
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

- **Report absent** → explain that the build needs to be run first; offer to invoke the `axiom-build` skill.
- **`finalStatus: "warning"`** → the app passed with non-blocking findings. Explain each; let the user decide whether to tighten `violationAction` to `"break"`.
- **AI review unavailable** (`aiReview.status: "not-run"`) → explain that the AI security review did not execute (typically because no AI adapter was configured); the static findings still apply.
- **Finding on test/verification code** (e.g., a `scripts/verify-*.js` path) — this is a known product gap: the app audit does not distinguish runtime code from test code. Explain this limitation; suggest the user treat such findings as reviewer judgment calls rather than hard blockers.
