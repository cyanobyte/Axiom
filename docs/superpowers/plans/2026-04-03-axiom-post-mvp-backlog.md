# Axiom Post-MVP Backlog

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Axiom from a working MVP into a cleaner, more trustworthy AI compiler by tightening output discipline, strengthening live verification, and creating the first safe dogfooding path.

**Architecture:** Keep `.axiom.js` as the primary authored source and the generated workspace as a disposable build artifact. Post-MVP work should improve the quality of the compiler experience without reintroducing hidden state or hiding the fact that AI is generating the software.

**Tech Stack:** Node.js, ESM, Vitest, child_process, filesystem metadata, CLI-backed agent adapters, local shell execution

---

### Task 1: Trim Raw Provider Chunks From Stored Events

**Goal:** Keep live CLI output visible and useful while preventing `result.events` from becoming a noisy transcript dump.

**Why this matters:** The default CLI output is now readable, but the final structured result still stores large provider prompts and raw JSON blobs. That makes debugging artifacts heavier than they need to be and undermines the “compiler result” feel.

**Files:**
- Modify: `src/runtime/create-event-stream.js`
- Modify: `src/runtime/create-run-context.js`
- Modify: `src/adapters/providers/create-codex-cli-agent-adapter.js`
- Modify: `src/adapters/providers/create-claude-cli-agent-adapter.js`
- Modify: `src/cli/run-command.js`
- Test: `test/runtime/event-stream.test.js`
- Test: `test/cli/run-command.test.js`

- [ ] **Step 1: Add failing tests for event/result compaction**

Assert that default runs keep compact event payloads while `--verbose` still shows raw provider output live.

- [ ] **Step 2: Compact stored step output events**

Keep only normalized summaries in `result.events`, for example:
- `visibility`
- short `chunk`
- optional `summary`

Avoid storing full raw prompts or duplicate giant JSON blobs unless verbose artifacts are explicitly requested later.

- [ ] **Step 3: Preserve live visibility**

Ensure the CLI still receives live progress/result output even if the stored event record is compacted.

- [ ] **Step 4: Run focused tests**

Run:
```bash
npm test -- test/runtime/event-stream.test.js test/cli/run-command.test.js
```

- [ ] **Step 5: Commit**

```bash
git add src/runtime/create-event-stream.js src/runtime/create-run-context.js src/adapters/providers/create-codex-cli-agent-adapter.js src/adapters/providers/create-claude-cli-agent-adapter.js src/cli/run-command.js test/runtime/event-stream.test.js test/cli/run-command.test.js
git commit -m "feat: compact stored compiler events"
```

### Task 2: Strengthen Live Example Verification

**Goal:** Replace the current synthetic live smoke verification with a more realistic proof that the generated app actually behaves as intended.

**Why this matters:** The live counter example currently writes the expected report directly during `npm test`. That proves the loop works, but it is weaker than a true generated-app verification path.

**Files:**
- Modify: `examples/live-counter/counter-webapp.axiom.js`
- Modify: `examples/live-counter/README.md`
- Modify: `examples/live-counter/axiom.config.js`
- Test: `test/examples/live-counter-runtime.test.js`
- Modify: `docs/superpowers/specs/axiom-mvp-acceptance.md`

- [ ] **Step 1: Add failing tests for stronger live verification expectations**

Require the generated project to prove more than “report file exists”, for example:
- server starts
- report reflects an actual HTTP or browser-driven check

- [ ] **Step 2: Tighten the coder contract**

Require generated files to include:
- a real test script
- a report generator driven by actual app behavior
- any minimal helper code needed for realistic verification

- [ ] **Step 3: Update the live acceptance notes**

Document the stronger acceptance rule so the smoke path proves more than a synthetic file write.

- [ ] **Step 4: Run targeted tests**

Run:
```bash
npm test -- test/examples/live-counter-runtime.test.js
```

- [ ] **Step 5: Commit**

```bash
git add examples/live-counter/counter-webapp.axiom.js examples/live-counter/README.md examples/live-counter/axiom.config.js test/examples/live-counter-runtime.test.js docs/superpowers/specs/axiom-mvp-acceptance.md
git commit -m "test: strengthen live smoke verification"
```

### Task 3: Introduce a Generated-App Health Report

**Goal:** Give users one compact end-of-run report that summarizes build freshness, steps, verifications, generated files, and failure guidance.

**Why this matters:** The CLI now prints useful progress, but the final structured result is still more machine-friendly than human-friendly. A health report would make Axiom feel more like a compiler/build tool.

**Files:**
- Create: `src/runtime/create-health-report.js`
- Modify: `src/public/run-intent-file.js`
- Modify: `src/cli/run-command.js`
- Test: `test/public/run-intent-file.test.js`
- Test: `test/cli/run-command.test.js`

- [ ] **Step 1: Add failing tests for a compact health summary**

Require a summary that includes:
- intent file path
- current source version
- previous built version if present
- run status
- step counts
- verification counts
- generated file count

- [ ] **Step 2: Generate the health report after each run**

Keep it small and deterministic, suitable for both CLI rendering and later documentation generation.

- [ ] **Step 3: Render a short compiler-style summary**

Print a concise final summary before the raw JSON result.

- [ ] **Step 4: Run focused tests**

Run:
```bash
npm test -- test/public/run-intent-file.test.js test/cli/run-command.test.js
```

- [ ] **Step 5: Commit**

```bash
git add src/runtime/create-health-report.js src/public/run-intent-file.js src/cli/run-command.js test/public/run-intent-file.test.js test/cli/run-command.test.js
git commit -m "feat: add compiler health summary"
```

### Task 4: Safe Dogfooding Workspace for Axiom

**Goal:** Create the first isolated path where Axiom can generate a small Axiom-targeted runtime slice without mutating the main runtime codebase.

**Why this matters:** The counter and echo examples prove the loop, but dogfooding requires a safe target where Axiom can start building Axiom-adjacent code without risking the primary source tree.

**Files:**
- Create: `examples/dogfood/axiom-runtime-slice.axiom.js`
- Create: `examples/dogfood/axiom.config.js`
- Create: `examples/dogfood/README.md`
- Create: `test/examples/axiom-runtime-slice-runtime.test.js`
- Modify: `test/examples/examples-load.test.js`
- Modify: `README.md`

- [ ] **Step 1: Add failing tests for the dogfood slice example**

Require a deterministic example that:
- loads successfully
- runs through the runtime
- generates into its own workspace

- [ ] **Step 2: Add the first isolated Axiom-targeted example**

Keep scope narrow. The generated target should be a small runtime slice, not a full self-hosting rewrite.

- [ ] **Step 3: Run targeted tests**

Run:
```bash
npm test -- test/examples/examples-load.test.js test/examples/axiom-runtime-slice-runtime.test.js
```

- [ ] **Step 4: Commit**

```bash
git add examples/dogfood README.md test/examples/examples-load.test.js test/examples/axiom-runtime-slice-runtime.test.js
git commit -m "docs: add first dogfood runtime slice example"
```

### Task 5: Measure Source Compression

**Goal:** Quantify whether Axiom is actually shorter than Markdown specs and shorter than generated source for meaningful projects.

**Why this matters:** This is one of the central product claims. It should be measured, not assumed.

**Files:**
- Create: `docs/superpowers/specs/axiom-source-compression.md`
- Modify: `README.md`

- [ ] **Step 1: Record baseline comparisons**

Measure at least:
- `.axiom.js` vs old `.md` docs for the same project intent
- `.axiom.js` vs generated source for:
  - `counter-webapp`
  - `echo-tool`

- [ ] **Step 2: Document where Axiom wins and where it does not**

Be explicit that tiny projects may not compress well enough to justify the abstraction.

- [ ] **Step 3: Publish the result**

Summarize the compression findings in both the spec doc and the README.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/axiom-source-compression.md README.md
git commit -m "docs: record axiom source compression baselines"
```

### Task 6: Final Post-MVP Verification

**Goal:** Close the first post-MVP round with evidence that the compiler experience is cleaner, stronger, and better documented.

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/axiom-mvp-acceptance.md`

- [ ] **Step 1: Run the full automated suite**

Run:
```bash
npm test
```

- [ ] **Step 2: Run the live smoke again**

Run:
```bash
node bin/axiom.js run examples/live-counter/counter-webapp.axiom.js
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/superpowers/specs/axiom-mvp-acceptance.md
git commit -m "docs: close first post-mvp compiler backlog round"
```
