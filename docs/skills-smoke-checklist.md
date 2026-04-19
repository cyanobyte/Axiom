# Skills Smoke Checklist

Walk this checklist once per skill after substantive edits. Run each prompt in Claude Code first, then in Codex (via the `codex` CLI invoked in the Axiom repo root so `AGENTS.md` is loaded).

## axiom-authoring

**Prompt:** `help me start an Axiom project for a counter web app`

Expected:
- LLM proposes running `ax init`.
- LLM offers compact vs. full mode options based on project size.
- LLM drafts a starter `.axiom.js` file and explains each section.
- LLM does NOT run `ax build` unprompted.

## axiom-build

**Setup:** point at `examples/live-counter/counter-webapp.axiom.js` (a known-good example in this repo).

**Prompt:** `build examples/live-counter/counter-webapp.axiom.js`

Expected:
- LLM runs `ax build examples/live-counter/counter-webapp.axiom.js` via Bash.
- LLM summarizes `healthReport` (status + step counts + verification counts).
- If verifications passed, LLM says so concisely; if any failed, LLM drills in on the specific `verificationId` and `diagnostics` entry.
- LLM offers follow-ups (analyze, security review).

## axiom-analyze

**Setup:** create a temporary copy of an example and remove a required field (e.g., delete the `what.capability` line).

**Prompt:** `analyze <the broken file>`

Expected:
- LLM runs `ax analyze <file>`.
- LLM renders findings grouped by severity.
- LLM translates schema errors into concrete edit suggestions without silently making edits.
- LLM offers `ax fix` if suggestions are safe.

## axiom-security-review

**Setup:** run `npm run docker:runner:codex-live` (or any recent build) so there's a fresh `securityReport` in the result JSON, with at least one warning.

**Prompt:** `review the security findings from that build`

Expected:
- LLM reads the `securityReport` from the most recent build.
- LLM groups findings by severity (`error`, `warning`).
- LLM cites `ruleId`, `path`, and `message` verbatim for each finding.
- LLM suggests concrete `.axiom.js` tightening (e.g., tighten `security.app.violationAction`).
- LLM does NOT modify the intent file unprompted.

## Cross-host parity

Repeat each prompt above in `codex` after Claude Code. Confirm:
- Codex loads the skill guidance from `AGENTS.md` on startup.
- Behavior is substantially similar to Claude Code (exact wording will differ).
- If a skill's behavior diverges noticeably on Codex, note it inline in the skill's "Common failure modes" section so future readers know about the host-specific quirk.
