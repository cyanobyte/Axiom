# Axiom Post-MVP Backlog

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Axiom from a working MVP into a cleaner, more trustworthy AI compiler by tightening output discipline, strengthening live verification, and creating the first safe dogfooding path.

**Architecture:** Keep `.axiom.js` as the primary authored source and the generated workspace as a disposable build artifact. Post-MVP work should improve the quality of the compiler experience without reintroducing hidden state or hiding the fact that AI is generating the software.

**Tech Stack:** Node.js, ESM, Vitest, child_process, filesystem metadata, CLI-backed agent adapters, local shell execution

---

## Product Goals By Phase

These are the four product outcomes that determine whether Axiom is worth using as a real source language:

1. less authored material for meaningful projects
2. higher predictability than prompt/docs/code alone
3. stronger verification and rebuild discipline
4. a better evolution model for real projects

### MVP Coverage

The current MVP already proves a first slice of all four:

- **Less Authored Material**
  - proven against Markdown/spec-heavy workflows for nontrivial examples
  - not yet proven for tiny projects
- **Higher Predictability**
  - structured `.axiom.js`
  - declared verification coverage
  - preflight readiness checks
  - sibling runtime config
- **Stronger Verification and Rebuild Discipline**
  - deterministic default suite
  - explicit verification IDs
  - clean rebuild metadata
  - isolated generated workspaces
- **Better Evolution Model**
  - edit `.axiom.js`, rerun, rebuild
  - git remains the source of version history
  - still weak for onboarding an existing codebase

### Post-MVP Targets

Post-MVP work should fully deliver all four:

- **Less Authored Material**
  - compact authoring mode for tiny/self-explanatory projects
  - stronger defaults and project templates
  - less repeated runtime boilerplate
- **Higher Predictability**
  - tighter output contracts
  - cleaner summaries and diagnostics
  - safer provider/config resolution
- **Stronger Verification and Rebuild Discipline**
  - more realistic live verification
  - compact health reports
  - less noisy result artifacts
- **Better Evolution Model**
  - `ax init --existing`
  - compiler-style `ax build`
  - eventually `ax debug`
  - safe dogfooding on Axiom itself

### First-Wave Priorities

The first post-MVP wave should prioritize adoption and authoring leverage before lower-level polish.

Ordered priorities:

1. compact mode / compression for tiny projects
2. `ax validate` so authors can tighten intent before running
3. stronger live verification
4. cleaner stored events and summaries
5. existing-project onboarding with `ax init --existing`
6. `ax update` for intentional source mutation

### Second-Wave Priorities

The second post-MVP wave should improve guided onboarding and deeper usability after the first-wave adoption blockers are addressed.

Likely second-wave items:

1. `ax init --query` for interactive new-project bootstrapping
2. `ax debug` editor/debugger integration
3. richer generated-output validation in `ax validate`
4. stronger dogfooding on larger Axiom-targeted slices

### Compiler Tool Track

The CLI should evolve into the main compiler/build-tool interface:

- `ax init`
  - bootstrap a new project
- `ax init --query`
  - ask guided questions to build a better starter Axiom file for a new project
- `ax init --existing <path>`
  - inspect an existing codebase and generate the first `.axiom.js`
- `ax validate`
  - analyze the current Axiom source for schema issues, ambiguities, readiness gaps, and weak verification
- `ax build`
  - build the local canonical Axiom file in the current directory
- `ax build <file>`
  - build a specific Axiom file explicitly
- `ax update`
  - apply selected improvements or fixes proposed by `ax validate`
- `ax debug`
  - later: launch the current project through a debugger-oriented flow

That CLI track should remain primary. Editor integrations should sit on top of it rather than replacing it.

### Task 1: Compact Mode For Tiny Projects

**Goal:** Make Axiom compress well for tiny self-explanatory programs like `echo-tool`.

**Why this matters:** Right now the strongest criticism of Axiom is that the authoring ceremony is still too large for very small projects. That directly threatens adoption.

**Files:**
- Modify: `src/definition/recognized-sections.js`
- Modify: `src/definition/validate-definition.js`
- Modify: `src/public/intent.js`
- Modify: `examples/cli/echo-tool.axiom.js`
- Test: `test/definition/validate-definition.test.js`
- Test: `test/examples/echo-tool-runtime.test.js`

- [ ] **Step 1: Define a compact-mode rule**

Allow a reduced authored surface for tiny projects, likely centered on:
- `meta`
- `what`
- `runtime`
- one domain section like `cli` or `library`
- optional `build`

- [ ] **Step 2: Expand compact definitions internally**

Normalize compact definitions into the richer runtime shape so the execution engine does not need two separate code paths.

- [ ] **Step 3: Rewrite the echo example into compact mode**

Use `echo-tool` as the proving ground for whether Axiom really compresses for tiny projects.

- [ ] **Step 4: Run focused tests**

Run:
```bash
npm test -- test/definition/validate-definition.test.js test/examples/echo-tool-runtime.test.js
```

- [ ] **Step 5: Commit**

```bash
git add src/definition/recognized-sections.js src/definition/validate-definition.js src/public/intent.js examples/cli/echo-tool.axiom.js test/definition/validate-definition.test.js test/examples/echo-tool-runtime.test.js
git commit -m "feat: add compact intent mode for tiny projects"
```

### Task 2: `ax validate` Source Analysis

**Goal:** Add a compiler-style validation command that finds schema errors, ambiguities, readiness gaps, and weak verification before execution.

**Why this matters:** `ax validate` should be the natural preflight/lint command for Axiom source. It needs to analyze, not mutate.

**MVP scope rule:** The first implementation of `ax validate` should validate source and config only. It should not become a full generated-output or build-state inspector yet, beyond possibly noting obvious staleness metadata later.

**Files:**
- Create: `src/cli/validate-command.js`
- Modify: `src/index.js`
- Modify: `bin/axiom.js`
- Modify: `src/public/load-intent-file.js`
- Modify: `src/public/load-runtime-config.js`
- Create: `test/cli/validate-command.test.js`
- Modify: `README.md`

- [ ] **Step 1: Add failing tests for `ax validate`**

Require:
- schema validation
- readiness diagnostics
- config/provider resolution diagnostics
- useful warning output without mutating source

Do not require:
- generated workspace inspection
- output artifact validation
- replaying or rebuilding the project

- [ ] **Step 2: Implement validation analysis**

Return:
- errors
- warnings
- suggestions

Do not modify the `.axiom.js` file in this command.

- [ ] **Step 3: Run focused tests**

Run:
```bash
npm test -- test/cli/validate-command.test.js
```

- [ ] **Step 4: Commit**

```bash
git add src/cli/validate-command.js src/index.js bin/axiom.js src/public/load-intent-file.js src/public/load-runtime-config.js test/cli/validate-command.test.js README.md
git commit -m "feat: add ax validate command"
```

### Task 3: Strengthen Live Example Verification

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

### Task 4: Trim Raw Provider Chunks From Stored Events

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

### Task 5: Introduce a Generated-App Health Report

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

### Task 6: Safe Dogfooding Workspace for Axiom

**Goal:** Create the first isolated path where Axiom can generate a small Axiom-targeted runtime slice without mutating the main runtime codebase.

**Why this matters:** The counter and echo examples prove the loop, but dogfooding requires a safe target where Axiom can start building Axiom-adjacent code without risking the primary source tree.

**Dogfooding rule:** The first serious dogfooding path should start with `ax init --existing .` against the Axiom repo itself. That generated starter `.axiom.js` should then be refined and used to evolve isolated runtime slices, rather than trying to hand-author full self-description from scratch.

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
Model the flow after:
- `ax init --existing .`
- refine the generated Axiom source
- build into an isolated dogfood workspace

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

### Task 7: Measure Source Compression

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

### Task 8: Existing-Project Onboarding

**Goal:** Make Axiom usable on real existing codebases instead of only greenfield examples.

**Why this matters:** A daily-use tool needs a migration path from normal repos into `.axiom.js`, not just a fresh-start story.

**Files:**
- Create: `src/cli/init-command.js`
- Modify: `src/index.js`
- Modify: `bin/axiom.js`
- Create: `test/cli/init-command.test.js`
- Modify: `README.md`

- [ ] **Step 1: Add a failing CLI test for `ax init --existing`**

Require a bootstrap flow that inspects the current repo and emits a starter `.axiom.js`.

- [ ] **Step 2: Implement the first bootstrap pass**

Keep it simple:
- detect stack
- detect domain
- detect build/test commands
- emit a starter Axiom file plus local config guidance

- [ ] **Step 3: Run focused tests**

Run:
```bash
npm test -- test/cli/init-command.test.js
```

- [ ] **Step 4: Commit**

```bash
git add src/cli/init-command.js src/index.js bin/axiom.js test/cli/init-command.test.js README.md
git commit -m "feat: add existing-project ax init bootstrap"
```

### Task 9: `ax` Compiler Command Surface

**Goal:** Make Axiom behave more like a compiler/build tool than a raw Node entrypoint.

**Why this matters:** The daily-use model should be `ax build`, not `node bin/axiom.js run ...`.

**Files:**
- Modify: `package.json`
- Modify: `bin/axiom.js`
- Modify: `src/cli/run-command.js`
- Modify: `README.md`
- Test: `test/cli/run-command.test.js`

- [ ] **Step 1: Add failing tests for `ax build` local-file discovery**

Require:
- `ax build` resolves the local canonical Axiom file
- `ax build <file>` still works
- clear failure when zero or multiple candidates exist

- [ ] **Step 2: Implement canonical local-file discovery**

Prefer the local project file in the current working directory so the common workflow becomes:
- edit `.axiom.js`
- run `ax build`

- [ ] **Step 3: Document the compiler workflow**

Update docs to reflect:
- `ax init`
- `ax init --existing`
- `ax validate`
- `ax build`
- `ax update`
- later `ax debug`

- [ ] **Step 4: Run focused tests**

Run:
```bash
npm test -- test/cli/run-command.test.js
```

- [ ] **Step 5: Commit**

```bash
git add package.json bin/axiom.js src/cli/run-command.js README.md test/cli/run-command.test.js
git commit -m "feat: add compiler-style ax build workflow"
```

### Task 10: `ax update` Suggested Source Changes

**Goal:** Add an explicit mutation command that can apply selected fixes or improvements proposed by `ax validate`.

**Why this matters:** Validation should propose. Mutation should be intentional and separate. This keeps Axiom aligned with a compiler/build-tool mental model instead of becoming a hidden agent.

**Files:**
- Create: `src/cli/update-command.js`
- Modify: `src/index.js`
- Modify: `bin/axiom.js`
- Modify: `README.md`
- Create: `test/cli/update-command.test.js`

- [ ] **Step 1: Add failing tests for `ax update`**

Require:
- explicit application of proposed changes
- no source mutation during `ax validate`
- clear reporting of what changed

- [ ] **Step 2: Implement the first update flow**

Start simple:
- apply suggested changes directly
- optionally show a patch preview
- avoid creating persistent patch files by default

- [ ] **Step 3: Run focused tests**

Run:
```bash
npm test -- test/cli/update-command.test.js
```

- [ ] **Step 4: Commit**

```bash
git add src/cli/update-command.js src/index.js bin/axiom.js README.md test/cli/update-command.test.js
git commit -m "feat: add ax update command"
```

### Task 11: Final Post-MVP Verification

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
