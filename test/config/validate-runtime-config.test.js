import { describe, expect, it } from 'vitest';
import { validateRuntimeConfig } from '../../src/config/validate-runtime-config.js';

describe('validateRuntimeConfig', () => {
  it('accepts a config with agents, workers, and artifacts', () => {
    const config = validateRuntimeConfig({
      agents: {
        planner: { provider: 'fake', model: 'planner-model' }
      },
      workers: {
        shell: { type: 'local-shell' }
      },
      workspace: {
        root: './examples/basic'
      },
      artifacts: {
        root: './reports'
      }
    });

    expect(config.artifacts.root).toBe('./reports');
  });

  it('rejects configs without any agent mappings', () => {
    expect(() => validateRuntimeConfig({
      workers: { shell: { type: 'local-shell' } },
      workspace: { root: './examples/basic' },
      artifacts: { root: './reports' }
    })).toThrow('Runtime config must define at least one agent');
  });
});
