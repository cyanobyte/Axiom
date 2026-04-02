import { describe, expect, it } from 'vitest';
import { loadIntentFile } from '../../src/index.js';

describe('canonical examples', () => {
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
});
