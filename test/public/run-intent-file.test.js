import { describe, expect, it } from 'vitest';
import { runIntentFile } from '../../src/index.js';

describe('runIntentFile', () => {
  it('loads the intent file, loads sibling config, and runs the workflow', async () => {
    const result = await runIntentFile('examples/basic/counter-webapp.axiom.js');

    expect(result.status).toBe('passed');
    expect(result.stepResults.map((step) => step.stepId)).toEqual([
      'brief',
      'plan',
      'implement',
      'test'
    ]);
  });
});
