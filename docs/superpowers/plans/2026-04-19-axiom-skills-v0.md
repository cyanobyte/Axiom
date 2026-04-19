# Axiom Skills v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship four Claude Code skills under `.claude/skills/` plus a generated `AGENTS.md` at the repo root, so developers can drive Axiom conversationally from Claude Code and Codex via the existing `ax` CLI.

**Architecture:** Skill markdown files are the source of truth. A small generator (`scripts/build-skills.js`) reads them and assembles `AGENTS.md`. Both outputs are committed. A `--check` mode keeps `AGENTS.md` in sync in `npm test`. No new runtime code; skills drive `ax` through each host's built-in Bash tool.

**Tech Stack:** Node.js 22+, ESM, Vitest, existing `ax` CLI. Zero new runtime dependencies.

---

## File Structure

**Create:**
- `.claude/skills/axiom-authoring.md`
- `.claude/skills/axiom-build.md`
- `.claude/skills/axiom-analyze.md`
- `.claude/skills/axiom-security-review.md`
- `AGENTS.md` (generated)
- `scripts/build-skills.js` — generator
- `docs/skills-smoke-checklist.md` — manual smoke checklist
- `test/skills/build-skills.test.js`
- `test/skills/build-skills-check.integration.test.js`
- `test/fixtures/skills/valid-pair/<two .md files>`
- `test/fixtures/skills/missing-name/<one .md>`
- `test/fixtures/skills/missing-description/<one .md>`
- `test/fixtures/skills/malformed-yaml/<one .md>`
- `test/fixtures/skills/duplicate-names/<two .md with same name>`
- `test/fixtures/skills/no-frontmatter/<one .md>`

**Modify:**
- `package.json` — add `skills:build` and `skills:check` scripts
- `README.md` — add Skills section

---

## Task 1: Scaffold Generator And Scripts

**Files:**
- Create: `scripts/build-skills.js` (stub)
- Modify: `package.json`
- Create: `.claude/skills/.gitkeep`
- Create: `test/fixtures/skills/.gitkeep`

- [ ] **Step 1: Create the skills directory placeholder**

Run:

```bash
mkdir -p .claude/skills test/fixtures/skills scripts
touch .claude/skills/.gitkeep test/fixtures/skills/.gitkeep
```

Expected: directories exist, two empty `.gitkeep` files created.

- [ ] **Step 2: Create the generator stub**

Create `scripts/build-skills.js`:

```js
#!/usr/bin/env node
/**
 * Purpose: Assemble AGENTS.md from .claude/skills/*.md.
 * Responsibilities:
 * - Read every skill file, parse its YAML frontmatter and body.
 * - Emit a deterministic AGENTS.md to the repo root.
 * - Support --check mode for CI drift detection.
 */

async function main() {
  console.error('build-skills.js: not yet implemented');
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
```

- [ ] **Step 3: Add package.json scripts**

Edit `package.json`. Change the existing `"scripts"` block to include two new entries:

Old:

```json
  "scripts": {
    "test": "vitest run",
    "docker:runner:build": "docker build -f docker/runner/node-webapp/Dockerfile -t axiom-build-node-webapp:local .",
    "docker:runner:smoke": "docker run --rm axiom-build-node-webapp:local sh -lc \"command -v ax\"",
    "docker:runner:integration": "node bin/ax.js build examples/docker-counter/counter-webapp.axiom.js",
    "docker:runner:codex-live": "node bin/ax.js build examples/docker-codex-counter/counter-webapp.axiom.js"
  },
```

New:

```json
  "scripts": {
    "test": "vitest run",
    "skills:build": "node scripts/build-skills.js",
    "skills:check": "node scripts/build-skills.js --check",
    "docker:runner:build": "docker build -f docker/runner/node-webapp/Dockerfile -t axiom-build-node-webapp:local .",
    "docker:runner:smoke": "docker run --rm axiom-build-node-webapp:local sh -lc \"command -v ax\"",
    "docker:runner:integration": "node bin/ax.js build examples/docker-counter/counter-webapp.axiom.js",
    "docker:runner:codex-live": "node bin/ax.js build examples/docker-codex-counter/counter-webapp.axiom.js"
  },
```

- [ ] **Step 4: Verify `npm run skills:build` runs (and currently fails loudly)**

Run:

```bash
npm run skills:build
```

Expected: prints `build-skills.js: not yet implemented` to stderr, exits with code 1. This confirms the script is wired; we will fill it in next task.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-skills.js package.json .claude/skills/.gitkeep test/fixtures/skills/.gitkeep
git commit -m "chore: scaffold skills generator and npm scripts"
```

---

## Task 2: Frontmatter Parser

**Files:**
- Modify: `scripts/build-skills.js`
- Create: `test/skills/build-skills.test.js`
- Create: `test/fixtures/skills/valid-pair/axiom-authoring.md`
- Create: `test/fixtures/skills/valid-pair/axiom-build.md`
- Create: `test/fixtures/skills/missing-name/bad.md`
- Create: `test/fixtures/skills/missing-description/bad.md`
- Create: `test/fixtures/skills/malformed-yaml/bad.md`
- Create: `test/fixtures/skills/no-frontmatter/bad.md`

- [ ] **Step 1: Create valid fixture pair**

Create `test/fixtures/skills/valid-pair/axiom-authoring.md`:

```markdown
---
name: axiom-authoring
description: Use when the user wants to create or refine a .axiom.js intent file.
---

# When to use

Greenfield or existing-project intent authoring.

# Instructions

Run `ax init` or `ax init --existing .`.
```

Create `test/fixtures/skills/valid-pair/axiom-build.md`:

```markdown
---
name: axiom-build
description: Use when the user wants to build an Axiom intent file.
---

# When to use

Any build request against a .axiom.js file.

# Instructions

Run `ax build <target>` and parse the JSON result.
```

- [ ] **Step 2: Create failing-case fixtures**

Create `test/fixtures/skills/missing-name/bad.md`:

```markdown
---
description: Has description but no name.
---

Body.
```

Create `test/fixtures/skills/missing-description/bad.md`:

```markdown
---
name: only-has-name
---

Body.
```

Create `test/fixtures/skills/malformed-yaml/bad.md`:

```markdown
---
name axiom-bad
description: Missing the colon on the name line.
---

Body.
```

Create `test/fixtures/skills/no-frontmatter/bad.md`:

```markdown
# Just a body

No frontmatter markers at all.
```

- [ ] **Step 3: Write failing tests for the parser**

Create `test/skills/build-skills.test.js`:

```js
import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '../../scripts/build-skills.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, '..', 'fixtures', 'skills');

describe('parseFrontmatter', () => {
  it('parses a valid file into frontmatter + body', async () => {
    const source = await fs.readFile(path.join(FIXTURES, 'valid-pair', 'axiom-authoring.md'), 'utf8');
    const parsed = parseFrontmatter(source, 'axiom-authoring.md');
    expect(parsed.frontmatter.name).toBe('axiom-authoring');
    expect(parsed.frontmatter.description).toBe('Use when the user wants to create or refine a .axiom.js intent file.');
    expect(parsed.body).toContain('# When to use');
    expect(parsed.body).toContain('Run `ax init`');
  });

  it('throws when frontmatter markers are missing', async () => {
    const source = await fs.readFile(path.join(FIXTURES, 'no-frontmatter', 'bad.md'), 'utf8');
    expect(() => parseFrontmatter(source, 'bad.md')).toThrow(/missing or malformed frontmatter/);
  });

  it('throws when required field "name" is absent', async () => {
    const source = await fs.readFile(path.join(FIXTURES, 'missing-name', 'bad.md'), 'utf8');
    expect(() => parseFrontmatter(source, 'bad.md')).toThrow(/missing required field 'name'/);
  });

  it('throws when required field "description" is absent', async () => {
    const source = await fs.readFile(path.join(FIXTURES, 'missing-description', 'bad.md'), 'utf8');
    expect(() => parseFrontmatter(source, 'bad.md')).toThrow(/missing required field 'description'/);
  });

  it('throws when a frontmatter line is malformed', async () => {
    const source = await fs.readFile(path.join(FIXTURES, 'malformed-yaml', 'bad.md'), 'utf8');
    expect(() => parseFrontmatter(source, 'bad.md')).toThrow(/invalid frontmatter YAML/);
  });
});
```

- [ ] **Step 4: Run tests to verify failure**

Run:

```bash
npm test -- test/skills/build-skills.test.js
```

Expected: FAIL because `parseFrontmatter` is not yet exported from `scripts/build-skills.js`.

- [ ] **Step 5: Implement the parser**

Replace the body of `scripts/build-skills.js` with:

```js
#!/usr/bin/env node
/**
 * Purpose: Assemble AGENTS.md from .claude/skills/*.md.
 * Responsibilities:
 * - Read every skill file, parse its YAML frontmatter and body.
 * - Emit a deterministic AGENTS.md to the repo root.
 * - Support --check mode for CI drift detection.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_SKILLS_DIR = path.join(REPO_ROOT, '.claude', 'skills');
const DEFAULT_AGENTS_PATH = path.join(REPO_ROOT, 'AGENTS.md');

export function parseFrontmatter(source, filename) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`${filename}: missing or malformed frontmatter`);
  }
  const [, frontmatterBlock, body] = match;
  const frontmatter = {};
  for (const rawLine of frontmatterBlock.split('\n')) {
    const line = rawLine.replace(/\s+$/, '');
    if (line.trim().length === 0) continue;
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`${filename}: invalid frontmatter YAML: "${line}"`);
    }
    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    frontmatter[key] = value;
  }
  if (!frontmatter.name || frontmatter.name.length === 0) {
    throw new Error(`${filename}: missing required field 'name'`);
  }
  if (!frontmatter.description || frontmatter.description.length === 0) {
    throw new Error(`${filename}: missing required field 'description'`);
  }
  return { frontmatter, body: body.trim() };
}

async function main() {
  console.error('build-skills.js: not yet implemented');
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run:

```bash
npm test -- test/skills/build-skills.test.js
```

Expected: all 5 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/build-skills.js test/skills/build-skills.test.js test/fixtures/skills/
git commit -m "feat: add frontmatter parser for skills generator"
```

---

## Task 3: Read Skills Directory And Assemble AGENTS.md

**Files:**
- Modify: `scripts/build-skills.js`
- Modify: `test/skills/build-skills.test.js`
- Create: `test/fixtures/skills/duplicate-names/a.md`
- Create: `test/fixtures/skills/duplicate-names/b.md`

- [ ] **Step 1: Create duplicate-names fixture**

Create `test/fixtures/skills/duplicate-names/a.md`:

```markdown
---
name: same-name
description: First file with this name.
---

Body A.
```

Create `test/fixtures/skills/duplicate-names/b.md`:

```markdown
---
name: same-name
description: Second file with this name.
---

Body B.
```

- [ ] **Step 2: Append failing tests for readSkills and assembleAgentsMd**

Append to `test/skills/build-skills.test.js`:

```js
import { readSkills, assembleAgentsMd } from '../../scripts/build-skills.js';

describe('readSkills', () => {
  it('reads and parses every .md file in the directory, sorted by filename', async () => {
    const skills = await readSkills(path.join(FIXTURES, 'valid-pair'));
    expect(skills.map((skill) => skill.filename)).toEqual(['axiom-authoring.md', 'axiom-build.md']);
    expect(skills[0].frontmatter.name).toBe('axiom-authoring');
    expect(skills[1].frontmatter.name).toBe('axiom-build');
  });

  it('throws when two files share the same frontmatter name', async () => {
    await expect(readSkills(path.join(FIXTURES, 'duplicate-names'))).rejects.toThrow(
      /duplicate skill name "same-name" in a\.md and b\.md/
    );
  });

  it('returns an empty array when the directory has no .md files', async () => {
    const tmp = await fs.mkdtemp(path.join((await import('node:os')).tmpdir(), 'skills-empty-'));
    const skills = await readSkills(tmp);
    expect(skills).toEqual([]);
    await fs.rm(tmp, { recursive: true, force: true });
  });
});

describe('assembleAgentsMd', () => {
  it('produces a deterministic AGENTS.md from parsed skills', async () => {
    const skills = await readSkills(path.join(FIXTURES, 'valid-pair'));
    const md = assembleAgentsMd(skills);
    expect(md.startsWith('# Axiom Agent Instructions')).toBe(true);
    expect(md).toContain('<!-- Generated from .claude/skills/*.md');
    expect(md).toContain('## axiom-authoring');
    expect(md).toContain('**When to use:** Use when the user wants to create or refine a .axiom.js intent file.');
    expect(md.indexOf('## axiom-authoring')).toBeLessThan(md.indexOf('## axiom-build'));
    expect(md.endsWith('\n')).toBe(true);
  });

  it('returns only the header when there are no skills', () => {
    const md = assembleAgentsMd([]);
    expect(md).toContain('# Axiom Agent Instructions');
    expect(md).not.toContain('##');
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
npm test -- test/skills/build-skills.test.js
```

Expected: FAIL because `readSkills` and `assembleAgentsMd` are not yet exported.

- [ ] **Step 4: Implement readSkills and assembleAgentsMd**

Edit `scripts/build-skills.js`. After the `parseFrontmatter` function and before the `main` function, insert:

```js
export async function readSkills(skillsDir) {
  let entries;
  try {
    entries = await fs.readdir(skillsDir);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const mdFiles = entries.filter((name) => name.endsWith('.md')).sort();
  const skills = [];
  const seenNames = new Map();

  for (const filename of mdFiles) {
    const fullPath = path.join(skillsDir, filename);
    const source = await fs.readFile(fullPath, 'utf8');
    const parsed = parseFrontmatter(source, filename);
    const existing = seenNames.get(parsed.frontmatter.name);
    if (existing) {
      throw new Error(
        `duplicate skill name "${parsed.frontmatter.name}" in ${existing} and ${filename}`
      );
    }
    seenNames.set(parsed.frontmatter.name, filename);
    skills.push({ filename, ...parsed });
  }

  return skills;
}

export function assembleAgentsMd(skills) {
  const lines = [
    '# Axiom Agent Instructions',
    '',
    '<!-- Generated from .claude/skills/*.md by scripts/build-skills.js. Do not edit by hand; run `npm run skills:build`. -->',
    ''
  ];
  for (const skill of skills) {
    lines.push(`## ${skill.frontmatter.name}`);
    lines.push('');
    lines.push(`**When to use:** ${skill.frontmatter.description}`);
    lines.push('');
    lines.push(skill.body);
    lines.push('');
  }
  return lines.join('\n');
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
npm test -- test/skills/build-skills.test.js
```

Expected: all previous tests PASS plus the 5 new tests for readSkills and assembleAgentsMd (10 total in this file).

- [ ] **Step 6: Commit**

```bash
git add scripts/build-skills.js test/skills/build-skills.test.js test/fixtures/skills/duplicate-names/
git commit -m "feat: read skills directory and assemble AGENTS.md"
```

---

## Task 4: Atomic Write And Default Mode

**Files:**
- Modify: `scripts/build-skills.js`
- Modify: `test/skills/build-skills.test.js`

- [ ] **Step 1: Append failing tests for writeAtomic and buildAgentsMd**

Append to `test/skills/build-skills.test.js`:

```js
import os from 'node:os';
import { writeAtomic, buildAgentsMd } from '../../scripts/build-skills.js';

describe('writeAtomic', () => {
  it('writes content via a temp path + rename', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-write-'));
    const target = path.join(dir, 'out.txt');

    await writeAtomic(target, 'hello');

    expect(await fs.readFile(target, 'utf8')).toBe('hello');
    const leftoverTemps = (await fs.readdir(dir)).filter((name) => name !== 'out.txt');
    expect(leftoverTemps).toEqual([]);

    await fs.rm(dir, { recursive: true, force: true });
  });

  it('overwrites an existing file', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-write-'));
    const target = path.join(dir, 'out.txt');
    await fs.writeFile(target, 'old');

    await writeAtomic(target, 'new');

    expect(await fs.readFile(target, 'utf8')).toBe('new');
    await fs.rm(dir, { recursive: true, force: true });
  });
});

describe('buildAgentsMd', () => {
  it('writes AGENTS.md at the configured output path and returns a summary', async () => {
    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-out-'));
    const target = path.join(outDir, 'AGENTS.md');

    const result = await buildAgentsMd({
      skillsDir: path.join(FIXTURES, 'valid-pair'),
      agentsPath: target
    });

    expect(result.skills).toBe(2);
    expect(result.bytes).toBeGreaterThan(0);
    const written = await fs.readFile(target, 'utf8');
    expect(written).toContain('## axiom-authoring');
    expect(written).toContain('## axiom-build');

    await fs.rm(outDir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/skills/build-skills.test.js
```

Expected: FAIL because `writeAtomic` and `buildAgentsMd` are not yet exported.

- [ ] **Step 3: Implement writeAtomic and buildAgentsMd**

Edit `scripts/build-skills.js`. Append before the `main` function:

```js
export async function writeAtomic(target, content) {
  const tmp = `${target}.tmp-${process.pid}`;
  await fs.writeFile(tmp, content);
  try {
    await fs.rename(tmp, target);
  } catch (error) {
    await fs.rm(tmp, { force: true });
    throw error;
  }
}

export async function buildAgentsMd({
  skillsDir = DEFAULT_SKILLS_DIR,
  agentsPath = DEFAULT_AGENTS_PATH
} = {}) {
  const skills = await readSkills(skillsDir);
  const content = assembleAgentsMd(skills);
  await writeAtomic(agentsPath, content);
  return { skills: skills.length, bytes: content.length };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- test/skills/build-skills.test.js
```

Expected: all tests PASS (now 13 in this file).

- [ ] **Step 5: Commit**

```bash
git add scripts/build-skills.js test/skills/build-skills.test.js
git commit -m "feat: add atomic write and buildAgentsMd entry"
```

---

## Task 5: Check Mode

**Files:**
- Modify: `scripts/build-skills.js`
- Modify: `test/skills/build-skills.test.js`

- [ ] **Step 1: Append failing tests for checkAgentsMd**

Append to `test/skills/build-skills.test.js`:

```js
import { checkAgentsMd } from '../../scripts/build-skills.js';

describe('checkAgentsMd', () => {
  it('reports ok: true when the file matches the expected output', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-check-'));
    const target = path.join(dir, 'AGENTS.md');
    await buildAgentsMd({ skillsDir: path.join(FIXTURES, 'valid-pair'), agentsPath: target });

    const result = await checkAgentsMd({
      skillsDir: path.join(FIXTURES, 'valid-pair'),
      agentsPath: target
    });

    expect(result.ok).toBe(true);

    await fs.rm(dir, { recursive: true, force: true });
  });

  it('reports ok: false with a diff when the file has drifted', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-check-'));
    const target = path.join(dir, 'AGENTS.md');
    await buildAgentsMd({ skillsDir: path.join(FIXTURES, 'valid-pair'), agentsPath: target });

    const current = await fs.readFile(target, 'utf8');
    await fs.writeFile(target, current.replace('axiom-authoring', 'axiom-authoring-OLD'));

    const result = await checkAgentsMd({
      skillsDir: path.join(FIXTURES, 'valid-pair'),
      agentsPath: target
    });

    expect(result.ok).toBe(false);
    expect(result.missing).toBeUndefined();
    expect(result.diff).toContain('axiom-authoring');

    await fs.rm(dir, { recursive: true, force: true });
  });

  it('reports ok: false with missing: true when the file is absent', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-check-'));
    const target = path.join(dir, 'AGENTS.md');

    const result = await checkAgentsMd({
      skillsDir: path.join(FIXTURES, 'valid-pair'),
      agentsPath: target
    });

    expect(result.ok).toBe(false);
    expect(result.missing).toBe(true);

    await fs.rm(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/skills/build-skills.test.js
```

Expected: FAIL because `checkAgentsMd` is not yet exported.

- [ ] **Step 3: Implement checkAgentsMd**

Edit `scripts/build-skills.js`. Append before the `main` function:

```js
export async function checkAgentsMd({
  skillsDir = DEFAULT_SKILLS_DIR,
  agentsPath = DEFAULT_AGENTS_PATH
} = {}) {
  const skills = await readSkills(skillsDir);
  const expected = assembleAgentsMd(skills);

  let actual;
  try {
    actual = await fs.readFile(agentsPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { ok: false, missing: true };
    }
    throw error;
  }

  if (expected === actual) return { ok: true };
  return { ok: false, diff: computeLineDiff(expected, actual) };
}

function computeLineDiff(expected, actual) {
  const expectedLines = expected.split('\n');
  const actualLines = actual.split('\n');
  const lines = [];
  const max = Math.max(expectedLines.length, actualLines.length);
  for (let index = 0; index < max; index += 1) {
    const e = expectedLines[index];
    const a = actualLines[index];
    if (e === a) continue;
    if (e !== undefined) lines.push(`+${index + 1}: ${e}`);
    if (a !== undefined) lines.push(`-${index + 1}: ${a}`);
  }
  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- test/skills/build-skills.test.js
```

Expected: all tests PASS (now 16 in this file).

- [ ] **Step 5: Commit**

```bash
git add scripts/build-skills.js test/skills/build-skills.test.js
git commit -m "feat: add --check mode with diff"
```

---

## Task 6: Wire Main Entry Point

**Files:**
- Modify: `scripts/build-skills.js`

- [ ] **Step 1: Replace the stub `main` with the real implementation**

In `scripts/build-skills.js`, replace the existing `main` function:

Old:

```js
async function main() {
  console.error('build-skills.js: not yet implemented');
  process.exit(1);
}
```

New:

```js
async function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');

  try {
    if (check) {
      const result = await checkAgentsMd();
      if (result.ok) {
        console.log('ok');
        process.exit(0);
      }
      if (result.missing) {
        console.error('ERROR: AGENTS.md not found. Run `npm run skills:build` to create it.');
        process.exit(1);
      }
      console.error('AGENTS.md is out of date. Run `npm run skills:build` and commit the result.\n');
      console.error(result.diff);
      process.exit(1);
    }

    const result = await buildAgentsMd();
    console.log(`Wrote AGENTS.md (${result.skills} skills, ${result.bytes} bytes)`);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
}
```

- [ ] **Step 2: Smoke the generator by pointing it at the valid-pair fixture via env**

Since the default path resolves from the real repo root (which doesn't have skill files yet), write a throwaway integration test that proves the CLI entry point works end-to-end. Append to `test/skills/build-skills.test.js`:

```js
import { spawnSync } from 'node:child_process';

describe('scripts/build-skills.js CLI', () => {
  it('prints a success summary when invoked with no args and there are zero skills', async () => {
    const repoRoot = path.resolve(__dirname, '..', '..');

    const backupSkills = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-backup-'));
    const liveSkillsDir = path.join(repoRoot, '.claude', 'skills');
    const liveAgentsPath = path.join(repoRoot, 'AGENTS.md');

    await fs.cp(liveSkillsDir, path.join(backupSkills, 'skills'), { recursive: true });
    const hadAgents = await fs.access(liveAgentsPath).then(() => true).catch(() => false);
    if (hadAgents) await fs.copyFile(liveAgentsPath, path.join(backupSkills, 'AGENTS.md'));

    try {
      await fs.rm(liveSkillsDir, { recursive: true, force: true });
      await fs.mkdir(liveSkillsDir, { recursive: true });
      await fs.rm(liveAgentsPath, { force: true });

      const outcome = spawnSync('node', [path.join('scripts', 'build-skills.js')], {
        cwd: repoRoot,
        encoding: 'utf8'
      });

      expect(outcome.status).toBe(0);
      expect(outcome.stdout).toMatch(/Wrote AGENTS\.md \(0 skills/);
      expect(await fs.readFile(liveAgentsPath, 'utf8')).toContain('# Axiom Agent Instructions');
    } finally {
      await fs.rm(liveSkillsDir, { recursive: true, force: true });
      await fs.cp(path.join(backupSkills, 'skills'), liveSkillsDir, { recursive: true });
      if (hadAgents) {
        await fs.copyFile(path.join(backupSkills, 'AGENTS.md'), liveAgentsPath);
      } else {
        await fs.rm(liveAgentsPath, { force: true });
      }
      await fs.rm(backupSkills, { recursive: true, force: true });
    }
  });
});
```

Note: this test backs up the live `.claude/skills/` and `AGENTS.md`, runs the CLI against an empty skills dir, and restores state in the `finally`. It proves the CLI entry works without corrupting whatever the author has in progress.

- [ ] **Step 3: Run the full suite**

Run:

```bash
npm test -- test/skills/build-skills.test.js
```

Expected: all tests pass, including the new CLI smoke.

- [ ] **Step 4: Commit**

```bash
git add scripts/build-skills.js test/skills/build-skills.test.js
git commit -m "feat: wire skills generator CLI entry point"
```

---

## Task 7: Integration Test Against The Real Tree

**Files:**
- Create: `test/skills/build-skills-check.integration.test.js`

- [ ] **Step 1: Write the drift-detection integration test**

Create `test/skills/build-skills-check.integration.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('npm run skills:check on the real tree', () => {
  it('exits 0 when .claude/skills/ and AGENTS.md are in sync', () => {
    const outcome = spawnSync('node', [path.join('scripts', 'build-skills.js'), '--check'], {
      cwd: REPO_ROOT,
      encoding: 'utf8'
    });

    if (outcome.status !== 0) {
      throw new Error(
        `skills:check failed. stdout=${outcome.stdout} stderr=${outcome.stderr}\n` +
          'Run `npm run skills:build` locally and commit the updated AGENTS.md.'
      );
    }

    expect(outcome.status).toBe(0);
  });
});
```

- [ ] **Step 2: Run the integration test — expected to fail until Task 12 runs `skills:build` on the real skills**

Run:

```bash
npm test -- test/skills/build-skills-check.integration.test.js
```

Expected: FAIL because `AGENTS.md` does not yet exist. This is expected — the test will pass once Task 12 generates it.

- [ ] **Step 3: Commit the integration test**

```bash
git add test/skills/build-skills-check.integration.test.js
git commit -m "test: add skills drift-detection integration test"
```

Note: this commit intentionally leaves the test failing. It will go green after Task 12. This is acceptable because:

1. The generator itself is fully tested in Task 2-6 — those all pass.
2. The integration test only fails because real skill content doesn't exist yet; it's a TDD pointer for Tasks 8-12.
3. If the engineer runs `npm test` between Task 7 and Task 12, they'll see this test failing with a clear message telling them what to do.

---

## Task 8: Author `axiom-authoring` Skill

**Files:**
- Create: `.claude/skills/axiom-authoring.md`

- [ ] **Step 1: Write the skill file**

Create `.claude/skills/axiom-authoring.md`:

```markdown
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
```

- [ ] **Step 2: Confirm the generator parses the new file in isolation**

Run:

```bash
node -e "import('./scripts/build-skills.js').then(async (m) => { const { parseFrontmatter } = m; const fs = await import('node:fs/promises'); const src = await fs.readFile('.claude/skills/axiom-authoring.md', 'utf8'); const parsed = parseFrontmatter(src, 'axiom-authoring.md'); console.log(parsed.frontmatter); })"
```

Expected: prints `{ name: 'axiom-authoring', description: '...' }` with the full description string, no errors.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/axiom-authoring.md
git commit -m "feat: add axiom-authoring skill"
```

---

## Task 9: Author `axiom-build` Skill

**Files:**
- Create: `.claude/skills/axiom-build.md`

- [ ] **Step 1: Write the skill file**

Create `.claude/skills/axiom-build.md`:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/axiom-build.md
git commit -m "feat: add axiom-build skill"
```

---

## Task 10: Author `axiom-analyze` Skill

**Files:**
- Create: `.claude/skills/axiom-analyze.md`

- [ ] **Step 1: Write the skill file**

Create `.claude/skills/axiom-analyze.md`:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/axiom-analyze.md
git commit -m "feat: add axiom-analyze skill"
```

---

## Task 11: Author `axiom-security-review` Skill

**Files:**
- Create: `.claude/skills/axiom-security-review.md`

- [ ] **Step 1: Write the skill file**

Create `.claude/skills/axiom-security-review.md`:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/axiom-security-review.md
git commit -m "feat: add axiom-security-review skill"
```

---

## Task 12: Generate Real AGENTS.md And Verify

**Files:**
- Create: `AGENTS.md` (via generator)

- [ ] **Step 1: Run the generator against the four skill files**

Run:

```bash
npm run skills:build
```

Expected: prints `Wrote AGENTS.md (4 skills, <N> bytes)` where N is a positive integer. `AGENTS.md` now exists at the repo root.

- [ ] **Step 2: Run skills:check to confirm the tree is now consistent**

Run:

```bash
npm run skills:check
```

Expected: prints `ok`, exit code 0.

- [ ] **Step 3: Run the full test suite**

Run:

```bash
npm test
```

Expected: all tests pass — including the `build-skills-check.integration.test.js` test that was previously failing because `AGENTS.md` didn't exist, and all existing tests.

- [ ] **Step 4: Commit the generated AGENTS.md**

```bash
git add AGENTS.md
git commit -m "feat: generate AGENTS.md from .claude/skills/"
```

Note: also delete the `.gitkeep` placeholders now that the directories have real content:

```bash
git rm .claude/skills/.gitkeep test/fixtures/skills/.gitkeep
git commit -m "chore: remove .gitkeep placeholders now that skills exist"
```

---

## Task 13: Smoke Checklist And README

**Files:**
- Create: `docs/skills-smoke-checklist.md`
- Modify: `README.md`

- [ ] **Step 1: Create the smoke checklist**

Create `docs/skills-smoke-checklist.md`:

```markdown
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
```

- [ ] **Step 2: Add a Skills section to the top-level README**

Open `README.md` and find the section just above `## Tests` (or the analogous heading). Append this new section immediately above that heading:

```markdown
## Skills

Axiom ships four Claude Code skills under `.claude/skills/` that drive the `ax` CLI conversationally:

- `axiom-authoring` — co-author a new `.axiom.js` file.
- `axiom-build` — run `ax build` and summarize the result.
- `axiom-analyze` — run `ax analyze` and interpret diagnostics.
- `axiom-security-review` — read the most recent build's `securityReport` and guide tightening.

The same guidance is available to Codex (and other `AGENTS.md`-aware agents) via the repo-root `AGENTS.md`, generated from `.claude/skills/`.

### Authoring

Edit a skill file under `.claude/skills/`, then regenerate:

```bash
npm run skills:build
```

Commit both the edited skill file and the updated `AGENTS.md`.

### Drift check

`npm test` includes a check that `AGENTS.md` is in sync with `.claude/skills/`. To run it directly:

```bash
npm run skills:check
```

After substantive skill changes, walk `docs/skills-smoke-checklist.md` once in Claude Code and once in Codex to confirm the guidance produces sensible behavior.
```

- [ ] **Step 3: Run the full test suite as the final check**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add docs/skills-smoke-checklist.md README.md
git commit -m "docs: document skills authoring workflow and smoke checklist"
```

---

## Self-Review

Before handing off, re-read this plan against the spec (`docs/superpowers/specs/2026-04-19-axiom-skills-v0-design.md`):

- [ ] Every "In scope" item in the spec is covered by at least one task above.
- [ ] Every file named in the spec's Components section is created in a task: `.claude/skills/axiom-authoring.md` (Task 8), `.claude/skills/axiom-build.md` (Task 9), `.claude/skills/axiom-analyze.md` (Task 10), `.claude/skills/axiom-security-review.md` (Task 11), `AGENTS.md` (Task 12), `scripts/build-skills.js` (Tasks 1-6), `docs/skills-smoke-checklist.md` (Task 13), `test/skills/build-skills.test.js` (Tasks 2-6), `test/skills/build-skills-check.integration.test.js` (Task 7), fixture directories (Tasks 2-3).
- [ ] The generator contract described in the spec matches the implementation in Tasks 2-6 (parseFrontmatter, readSkills, assembleAgentsMd, writeAtomic, buildAgentsMd, checkAgentsMd).
- [ ] The testing approach matches Tasks 2-7 (unit tests + drift integration test + CLI smoke).
- [ ] The acceptance criteria at the end of the spec are all reachable by the end of Task 13.
- [ ] Every task commits before the next begins.
- [ ] No placeholders (TBD/TODO/FIXME) anywhere in task content.

Edit this plan file and mark each `- [ ]` checkbox `- [x]` as each step is completed during execution.
