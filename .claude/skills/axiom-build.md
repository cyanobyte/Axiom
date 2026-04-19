---
name: axiom-build
description: Use when the user wants to build an Axiom intent file or asks about build results. Triggers include "build this", "ax build", "run the axiom build", "did it pass", "build counter-webapp".
---

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
