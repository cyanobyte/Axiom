import { describe, expect, it } from 'vitest';
import { loadIntentFile } from '../../src/index.js';

describe('canonical examples', () => {
  it('loads the todo app example', async () => {
    const file = await loadIntentFile('docs/superpowers/examples/todo-app.axiom.js');
    expect(file.definition.id).toBe('todo-webapp-mvp');
  });

  it('loads the axiom runtime example', async () => {
    const file = await loadIntentFile('docs/superpowers/examples/axiom-runtime.axiom.js');
    expect(file.definition.id).toBe('axiom-runtime-mvp');
  });
});
