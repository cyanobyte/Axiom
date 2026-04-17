import { describe, expect, it } from 'vitest';
import { createConfiguredAdapters } from '../../src/adapters/create-configured-adapters.js';

const runtimeConfig = {
  workspace: { root: './host/generated' },
  artifacts: { root: '../host-reports' },
  agents: {},
  workers: { shell: { type: 'fake-shell' } }
};

describe('createConfiguredAdapters runner overrides', () => {
  it('uses runner workspace and artifact roots only when AXIOM_RUNNER is set', async () => {
    const adapters = createConfiguredAdapters({
      runtimeConfig,
      environment: {
        AXIOM_RUNNER: '1',
        AXIOM_WORKSPACE_ROOT: '/workspace/generated',
        AXIOM_ARTIFACTS_ROOT: '/workspace/reports'
      }
    });

    expect(adapters.workspace.root()).toBe('/workspace/generated');
    expect(adapters.artifacts.root()).toBe('/workspace/reports');
  });

  it('ignores runner root variables outside runner mode', async () => {
    const adapters = createConfiguredAdapters({
      runtimeConfig,
      environment: {
        AXIOM_WORKSPACE_ROOT: '/workspace/generated',
        AXIOM_ARTIFACTS_ROOT: '/workspace/reports'
      }
    });

    expect(adapters.workspace.root()).toBe('./host/generated');
    expect(adapters.artifacts.root()).toBe('host/host-reports');
  });
});
