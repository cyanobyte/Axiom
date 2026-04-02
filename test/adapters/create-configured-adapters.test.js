import { describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createLocalWorkspaceAdapter } from '../../src/adapters/create-local-workspace-adapter.js';
import { createLocalArtifactAdapter } from '../../src/adapters/create-local-artifact-adapter.js';

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
});
