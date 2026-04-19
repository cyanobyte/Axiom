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

async function main() {
  console.error('build-skills.js: not yet implemented');
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
