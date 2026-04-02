import { describe, expect, it } from 'vitest';
import { intent, must, outcome, runIntent } from '../../src/index.js';
import { createTestAdapters } from '../../src/adapters/test-adapters.js';

describe('runIntent', () => {
  it('executes steps in source order and returns structured results', async () => {
    const order = [];

    const file = intent(
      {
        id: 'runtime-sample',
        meta: { title: 'Runtime Sample' },
        what: { capability: 'sample', description: 'Sample runtime' },
        why: { problem: 'Need runtime', value: 'Verify source order' },
        scope: { includes: [], excludes: [] },
        runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
        constraints: [must('must-exist', 'Constraint exists')],
        outcomes: [outcome('works', 'It works')],
        verification: { intent: [], outcome: [] },
        library: { kind: 'package' }
      },
      async (ctx) => {
        await ctx.step('first', async () => {
          order.push('first');
          return { value: 1 };
        });
        await ctx.step('second', async () => {
          order.push('second');
          return { value: 2 };
        });
        return { ok: true };
      }
    );

    const result = await runIntent(file, createTestAdapters());

    expect(order).toEqual(['first', 'second']);
    expect(result.status).toBe('passed');
    expect(result.stepResults.map((item) => item.stepId)).toEqual(['first', 'second']);
    expect(result.finalValue).toEqual({ ok: true });
  });
});
