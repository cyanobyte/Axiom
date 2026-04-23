import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '../../scripts/build-skills.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, '..', 'fixtures', 'skills');

describe('parseFrontmatter', () => {
  it('parses a valid file into frontmatter + body', async () => {
    const source = await fs.readFile(path.join(FIXTURES, 'valid-pair', 'axiom-authoring', 'SKILL.md'), 'utf8');
    const parsed = parseFrontmatter(source, 'axiom-authoring/SKILL.md');
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

import { readSkills, assembleAgentsMd } from '../../scripts/build-skills.js';
import os from 'node:os';

describe('readSkills', () => {
  it('reads every subdirectory containing SKILL.md, sorted by directory name', async () => {
    const skills = await readSkills(path.join(FIXTURES, 'valid-pair'));
    expect(skills.map((skill) => skill.dir)).toEqual(['axiom-authoring', 'axiom-build']);
    expect(skills[0].frontmatter.name).toBe('axiom-authoring');
    expect(skills[1].frontmatter.name).toBe('axiom-build');
  });

  it('throws when two skill directories share the same frontmatter name', async () => {
    await expect(readSkills(path.join(FIXTURES, 'duplicate-names'))).rejects.toThrow(
      /duplicate skill name "same-name" in a and b/
    );
  });

  it('returns an empty array when there are no skill subdirectories', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-empty-'));
    const skills = await readSkills(tmp);
    expect(skills).toEqual([]);
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('skips subdirectories without a SKILL.md', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-no-skill-'));
    await fs.mkdir(path.join(tmp, 'empty-subdir'));
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
    expect(md).toContain('<!-- Generated from .claude/skills/*/SKILL.md');
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

import { spawnSync } from 'node:child_process';

describe('scripts/build-skills.js CLI', () => {
  it('writes AGENTS.md when invoked with no args and reports success when stdout capture is available', async () => {
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
      expect(await fs.readFile(liveAgentsPath, 'utf8')).toContain('# Axiom Agent Instructions');
      if (outcome.error?.code !== 'EPERM') {
        expect(outcome.stdout).toMatch(/Wrote AGENTS\.md \(0 skills/);
      }
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
