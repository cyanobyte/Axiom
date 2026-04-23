import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkAgentsMd } from '../../scripts/build-skills.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('npm run skills:check on the real tree', () => {
  it('exits 0 when .claude/skills/ and AGENTS.md are in sync', async () => {
    const outcome = spawnSync('node', [path.join('scripts', 'build-skills.js'), '--check'], {
      cwd: REPO_ROOT,
      encoding: 'utf8'
    });

    if (outcome.error?.code === 'EPERM') {
      const result = await checkAgentsMd();
      expect(result.ok).toBe(true);
      return;
    }

    if (outcome.status !== 0) {
      throw new Error(
        `skills:check failed. stdout=${outcome.stdout} stderr=${outcome.stderr} error=${outcome.error}\n` +
          'Run `npm run skills:build` locally and commit the updated AGENTS.md.'
      );
    }

    expect(outcome.status).toBe(0);
  });
});
