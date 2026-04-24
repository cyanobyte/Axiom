# Skills Smoke Checklist

Walk this checklist once per skill after substantive edits. Run each prompt in Claude Code first, then in Codex (via the `codex` CLI invoked in the Axiom repo root so `AGENTS.md` is loaded).

## ax-intent

**Prompt A (create):** `help me start an Axiom project for a counter web app`

Expected:
- LLM asks whether the target directory has a `package.json` (since `ax init --existing <path>` requires one).
- LLM proposes running `ax init --existing <path>` — NOT bare `ax init`, which does not exist as a CLI mode.
- If there is no `package.json`, the LLM either offers to `npm init -y` first (with consent) or offers to hand-author a starter `.axiom.js`.
- After any starter file is produced, the LLM reads it and explains each section; offers to tailor `constraints`, `outcomes`, and `verification`.
- LLM does NOT run `ax build` unprompted.

**Prompt B (update):** `update this .axiom.js to add a security block and tighten verification`

Expected:
- LLM recognizes this as an existing-intent edit request rather than a bootstrap request.
- LLM reads the existing `.axiom.js` first and summarizes only the sections relevant to the requested change.
- LLM proposes the concrete edits it would make (`security`, `constraints`, `verification`, or similar).
- LLM asks for approval before modifying the file.
- After approval, LLM makes the agreed edit and offers `ax analyze` to validate it.
- LLM does NOT detour into general brainstorming when the requested change is already concrete.

## axiom-build

**Setup:** point at `examples/live-counter/counter-webapp.axiom.js` (a known-good example in this repo). This example does NOT declare `security:`, so the build result will have no top-level `securityReport` — that is the intended test for the "absent report" branch of both the build and security-review skills.

**Prompt:** `build examples/live-counter/counter-webapp.axiom.js`

Expected:
- LLM runs `ax build examples/live-counter/counter-webapp.axiom.js` via Bash.
- On Codex, if `ax` is not on `PATH`, the LLM may fall back to the repo-local equivalent `node bin/ax.js build examples/live-counter/counter-webapp.axiom.js`.
- LLM parses the JSON result by slicing from the first `{` line — NOT by `JSON.parse`-ing the whole stdout (which starts with `[step] ...` progress lines).
- LLM summarizes `healthReport` (status + step counts + verification counts).
- LLM refers to the top-level verification array as `verification` (singular), NOT `verifications`.
- LLM notes that `securityReport` is absent for this example because the intent has no `security:` section — it does not invent findings.
- If verifications passed, LLM says so concisely; if any failed, LLM drills in on the specific `verificationId` and `diagnostics` entry.
- LLM offers follow-ups (analyze, security review).

## axiom-analyze

**Setup:** create an in-repo copy of `examples/live-counter/counter-webapp.axiom.js` (keep it inside the repo so `node_modules` resolves) and delete the entire `what: { ... }` block. Removing just `what.capability` is NOT enough — the analyzer only rejects the intent when the whole `what` section is absent.

**Prompt:** `analyze <the broken file>`

Expected:
- LLM runs `ax analyze <file>`.
- On Codex, if `ax` is not on `PATH`, the LLM may fall back to the repo-local equivalent `node bin/ax.js analyze <file>`.
- LLM renders findings grouped by severity using the real shape: `errors[].{kind, section, message, nextAction}` (+ optional `id` and `fix`). It does NOT cite a `field` key — that is not in the analyzer's output.
- LLM quotes `nextAction` verbatim.
- LLM translates schema errors into concrete edit suggestions without silently making edits.
- LLM offers `ax fix <file> --apply <id>` if a suggestion has a fix `id`.

## axiom-security-review

**Setup A (report present):** run a build against an example that declares `security:`. Prefer `node bin/ax.js build examples/docker-counter/counter-webapp.axiom.js` (or `npm run docker:runner:codex-live`) when Docker is available. If Docker is unavailable, use `node bin/ax.js build examples/basic/counter-webapp.axiom.js`, which still produces a top-level `securityReport` with a build warning in local mode.

**Setup B (report absent):** run a build against `examples/live-counter/counter-webapp.axiom.js`, which declares no `security:`. The result JSON has no `securityReport` key — this is the input for testing the absent-report branch.

**Prompt:** `review the security findings from that build`

Expected (Setup A):
- LLM reads the `securityReport` from the most recent build.
- LLM groups findings by severity (`error`, `warning`).
- LLM cites `ruleId`, `path`, and `message` verbatim for each finding.
- LLM suggests concrete `.axiom.js` tightening (e.g., tighten `security.app.violationAction`).
- LLM does NOT modify the intent file unprompted.

Expected (Setup B):
- LLM detects that the top-level `securityReport` key is absent.
- LLM tells the user the intent has no `security:` declaration, so no report was produced (NOT "no findings, looks safe").
- LLM offers to help add a `security: { build, app, shell }` block to the `.axiom.js` — does not invent findings.

## Cross-host parity

Repeat each prompt above in `codex` after Claude Code. Confirm:
- Codex loads the skill guidance from `AGENTS.md` on startup.
- Behavior is substantially similar to Claude Code (exact wording will differ).
- If `ax` is not on `PATH` in the Codex shell, Codex should recover by using the repo-local CLI entry point `node bin/ax.js ...` rather than stopping.
- For `ax-intent`, Codex should distinguish create vs. update requests in its first response and should ask before editing an existing `.axiom.js`.
- If a skill's behavior diverges noticeably on Codex, note it inline in the skill's "Common failure modes" section so future readers know about the host-specific quirk.
