import { describe, expect, it } from 'vitest';
import { runIntentFile } from '../../src/index.js';

describe('echo tool example via file runtime', () => {
  it('runs through sibling runtime config', async () => {
    const result = await runIntentFile('examples/cli/echo-tool.axiom.js');

    expect(result.status).toBe('passed');
    expect(result.stepResults.map((step) => step.stepId)).toEqual([
      'brief',
      'plan',
      'implement',
      'test'
    ]);
    expect(result.finalValue).toEqual({
      ok: true,
      app: 'echo-tool',
      verifiedOutcomes: {
        total: 2,
        passed: 2,
        failed: 0
      }
    });
  });
});
