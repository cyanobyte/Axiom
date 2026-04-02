import { describe, expect, it } from 'vitest';
import { intent, must, outcome, verify, runIntent } from '../../src/index.js';
import { createTestAdapters } from '../../src/adapters/test-adapters.js';

describe('verification execution', () => {
  it('runs verification by declared id and records coverage', async () => {
    const file = intent(
      {
        id: 'verify-sample',
        meta: { title: 'Verify Sample' },
        what: { capability: 'sample', description: 'Sample runtime' },
        why: { problem: 'Need runtime', value: 'Verify checks' },
        scope: { includes: [], excludes: [] },
        runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
        constraints: [must('must-exist', 'Constraint exists')],
        outcomes: [outcome('works', 'It works')],
        verification: {
          intent: [verify('plan-covers-core', ['must-exist'])],
          outcome: [verify('works-check', ['works'])]
        },
        library: { kind: 'package' }
      },
      async (ctx) => {
        await ctx.verify.intent('plan-covers-core', {
          severity: 'error',
          run: async () => ({ passed: true, evidence: { ok: true } })
        });
        return { ok: true };
      }
    );

    const result = await runIntent(file, createTestAdapters());

    expect(result.verification).toEqual([
      {
        verificationId: 'plan-covers-core',
        kind: 'intent',
        status: 'passed',
        covers: ['must-exist'],
        evidence: [{ ok: true }],
        diagnostics: [],
        severity: 'error'
      }
    ]);
  });
});
