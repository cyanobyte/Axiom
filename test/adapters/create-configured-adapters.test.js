import { describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createLocalWorkspaceAdapter } from '../../src/adapters/create-local-workspace-adapter.js';
import { createLocalArtifactAdapter } from '../../src/adapters/create-local-artifact-adapter.js';
import { createConfiguredAdapters } from '../../src/adapters/create-configured-adapters.js';

describe('local adapters', () => {
  it('reads files from the configured workspace and artifact roots', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'axiom-local-'));
    await fs.mkdir(path.join(root, 'reports'));
    await fs.writeFile(path.join(root, 'reports', 'sample.json'), JSON.stringify({ ok: true }));

    const workspace = createLocalWorkspaceAdapter(root);
    const artifacts = createLocalArtifactAdapter(root, './reports');

    expect(workspace.root()).toBe(root);
    expect(await artifacts.read('sample.json')).toEqual({ ok: true });
  });

  it('maps capability names to configured agent providers', async () => {
    const adapters = createConfiguredAdapters({
      intentFilePath: 'examples/basic/counter-webapp.axiom.js',
      runtimeConfig: {
        agents: {
          planner: { provider: 'fake', responses: { planner: { ok: true } } }
        },
        workers: { shell: { type: 'local-shell' } },
        artifacts: { root: './reports' },
        workspace: { root: process.cwd() }
      }
    });

    const planner = adapters.ai.agent('planner');
    expect(await planner.run({ value: 1 })).toEqual({ ok: true });
  });
});
