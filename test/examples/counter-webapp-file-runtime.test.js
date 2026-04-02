import { describe, expect, it } from 'vitest';
import { runIntentFile } from '../../src/index.js';

describe('basic counter example via file runtime', () => {
  it('runs through sibling runtime config', async () => {
    const result = await runIntentFile('examples/basic/counter-webapp.axiom.js');

    expect(result.status).toBe('passed');
    expect(result.finalValue.app).toBe('counter-webapp');
  });
});
