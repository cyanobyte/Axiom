import { describe, expect, it } from 'vitest';
import { intent, must, outcome, runIntent } from '../../src/index.js';
import { createTestAdapters } from '../../src/adapters/test-adapters.js';

describe('intent revision', () => {
  it('marks the run as requiring rerun when an intent revision is applied', async () => {
    const file = intent(
      {
        id: 'revision-sample',
        meta: { title: 'Revision Sample' },
        what: { capability: 'sample', description: 'Sample runtime' },
        why: { problem: 'Need revisions', value: 'Require rerun' },
        scope: { includes: [], excludes: [] },
        runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
        constraints: [must('must-exist', 'Constraint exists')],
        outcomes: [outcome('works', 'It works')],
        verification: { intent: [], outcome: [] },
        library: { kind: 'package' }
      },
      async (ctx) => {
        await ctx.reviseIntent({
          filePath: 'sample.axiom.js',
          patch: 'patch-content'
        });
        return { ok: true };
      }
    );

    const result = await runIntent(file, createTestAdapters());

    expect(result.status).toBe('terminated-requires-rerun');
    expect(result.intentRevision).toEqual({
      filePath: 'sample.axiom.js',
      patch: 'patch-content'
    });
  });
});
