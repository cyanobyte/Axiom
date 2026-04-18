import { describe, expect, it } from 'vitest';
import { loadIntentFile } from '../../src/index.js';

describe('canonical examples', () => {
  it('loads the echo tool CLI example', async () => {
    const file = await loadIntentFile('examples/cli/echo-tool.axiom.js');
    expect(file.definition.id).toBe('echo-tool');
    expect(file.definition.cli.command).toBe('echo-tool');
    expect(file.definition.build.commands.test).toBe('npm test');
    expect(file.runFn).toBeTypeOf('function');
  });

  it('loads the basic counter web app example', async () => {
    const file = await loadIntentFile('examples/basic/counter-webapp.axiom.js');
    expect(file.definition.id).toBe('counter-webapp-basic');
    expect(file.definition.web.kind).toBe('full-stack');
    expect(file.definition.build.commands.test).toBe('npm test');
    expect(file.definition.web.api.endpoints[0].response).toEqual({ count: 'number' });
    expect(file.runFn).toBeTypeOf('function');
  });

  it('loads the Docker counter web app example', async () => {
    const file = await loadIntentFile('examples/docker-counter/counter-webapp.axiom.js');
    expect(file.definition.id).toBe('counter-webapp-docker');
    expect(file.definition.security.build.mode).toBe('docker');
    expect(file.definition.security.build.profile).toBe('node-webapp');
    expect(file.definition.web.kind).toBe('full-stack');
    expect(file.runFn).toBeTypeOf('function');
  });

  it('loads the Docker Codex live counter web app example', async () => {
    const file = await loadIntentFile('examples/docker-codex-counter/counter-webapp.axiom.js');
    expect(file.definition.id).toBe('counter-webapp-docker-codex-live');
    expect(file.definition.security.build.mode).toBe('docker');
    expect(file.definition.security.build.profile).toBe('node-webapp-codex-live');
    expect(file.definition.web.kind).toBe('full-stack');
    expect(file.runFn).toBeTypeOf('function');
  });

  it('loads the live counter web app example', async () => {
    const file = await loadIntentFile('examples/live-counter/counter-webapp.axiom.js');
    expect(file.definition.id).toBe('counter-webapp-live');
    expect(file.definition.web.kind).toBe('full-stack');
    expect(file.definition.build.commands.test).toBe('npm test');
    expect(file.runFn).toBeTypeOf('function');
  });

  it('loads the todo app example', async () => {
    const file = await loadIntentFile('docs/superpowers/examples/todo-app.axiom.js');
    expect(file.definition.id).toBe('todo-webapp-mvp');
    expect(file.definition.verification.intent.length).toBeGreaterThan(0);
    expect(file.runFn).toBeTypeOf('function');
  });

  it('loads the axiom runtime example', async () => {
    const file = await loadIntentFile('docs/superpowers/examples/axiom-runtime.axiom.js');
    expect(file.definition.id).toBe('axiom-runtime-mvp');
    expect(file.definition.library.kind).toBe('package');
    expect(file.runFn).toBeTypeOf('function');
  });

  it('loads the dogfood runtime slice example', async () => {
    const file = await loadIntentFile('examples/dogfood/axiom-runtime-slice.axiom.js');
    expect(file.definition.id).toBe('axiom-runtime-slice');
    expect(file.definition.library.kind).toBe('package');
    expect(file.definition.build.commands.test).toBe('npm test');
    expect(file.runFn).toBeTypeOf('function');
  });
});
