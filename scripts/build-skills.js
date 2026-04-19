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
