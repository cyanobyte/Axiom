import { describe, expect, it } from 'vitest';
import { loadIntentFile } from '../../src/index.js';

describe('loadIntentFile', () => {
  it('loads an authored intent module from disk', async () => {
    const file = await loadIntentFile('docs/superpowers/examples/todo-app.axiom.js');

    expect(file.kind).toBe('intent-file');
    expect(file.definition.id).toBe('todo-webapp-mvp');
  });
});
