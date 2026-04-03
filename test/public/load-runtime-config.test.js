import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { loadRuntimeConfig } from '../../src/public/load-runtime-config.js';

describe('loadRuntimeConfig', () => {
  it('loads axiom.config.js from the same directory as the intent file', async () => {
    const config = await loadRuntimeConfig(path.resolve('examples/basic/counter-webapp.axiom.js'));
    expect(config.agents.planner.provider).toBe('fake');
    expect(config.workspace.root).toBe('./examples/basic/generated');
    expect(config.artifacts.root).toBe('../reports');
  });

  it('throws a clear error when the sibling config file is missing', async () => {
    await expect(
      loadRuntimeConfig(path.resolve('docs/superpowers/examples/todo-app.axiom.js'))
    ).rejects.toThrow('Missing runtime config: axiom.config.js');
  });

  it('loads the live example config with an isolated generated workspace root', async () => {
    const config = await loadRuntimeConfig(path.resolve('examples/live-counter/counter-webapp.axiom.js'));

    expect(config.agents.planner.provider).toBe('codex-cli');
    expect(config.workspace.root).toBe('./examples/live-counter/generated');
    expect(config.artifacts.root).toBe('./reports');
  });
});
