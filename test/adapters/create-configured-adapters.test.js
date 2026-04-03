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
    await fs.mkdir(path.join(root, 'generated'));

    const workspace = createLocalWorkspaceAdapter(root);
    const artifacts = createLocalArtifactAdapter(root, './reports');
    const siblingArtifacts = createLocalArtifactAdapter(path.join(root, 'generated'), '../reports');

    expect(workspace.root()).toBe(root);
    expect(await artifacts.read('sample.json')).toEqual({ ok: true });
    expect(await siblingArtifacts.read('reports/sample.json')).toEqual({ ok: true });
  });

  it('maps capability names to configured agent providers', async () => {
    const adapters = createConfiguredAdapters({
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

  it('maps CLI-backed providers for live runtime execution', async () => {
    const calls = [];
    const adapters = createConfiguredAdapters({
      runtimeConfig: {
        agents: {
          planner: {
            provider: 'codex-cli',
            model: 'gpt-5.4-codex',
            runner: async (spec) => {
              calls.push(spec);
              return { stdout: 'noisy', stderr: '', exitCode: 0, lastMessage: 'PLANNED' };
            }
          }
        },
        workers: { shell: { type: 'fake-shell' } },
        artifacts: { root: './reports' },
        workspace: { root: process.cwd() }
      }
    });

    const planner = adapters.ai.agent('planner');
    expect(await planner.run({ prompt: 'Plan the app.' })).toBe('PLANNED');
    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe('codex');
  });
});
