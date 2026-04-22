---
name: axiom-security-review
description: Use when the user wants to audit the security posture of a build or generated app, or tighten `security` declarations. Triggers include "audit this build", "is this safe", "security report", "tighten the security policy", "explain the security warnings".
---

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
