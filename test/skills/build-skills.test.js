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
