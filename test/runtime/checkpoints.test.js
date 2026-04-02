import { describe, expect, it } from 'vitest';
import { intent, must, outcome, runIntent } from '../../src/index.js';
import { createTestAdapters } from '../../src/adapters/test-adapters.js';

describe('checkpoints', () => {
  it('stores pending checkpoint data when approval is requested', async () => {
    const file = intent(
      {
        id: 'checkpoint-sample',
        meta: { title: 'Checkpoint Sample' },
        what: { capability: 'sample', description: 'Sample runtime' },
        why: { problem: 'Need checkpoints', value: 'Pause safely' },
        scope: { includes: [], excludes: [] },
        runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
        constraints: [must('must-exist', 'Constraint exists')],
        outcomes: [outcome('works', 'It works')],
        verification: { intent: [], outcome: [] },
        library: { kind: 'package' }
      },
      async (ctx) => {
        await ctx.checkpoint.approval('approve-plan', {
          message: 'Approve?',
          data: { ok: true }
        });
        return { ok: true };
      }
    );

    const adapters = createTestAdapters({
      checkpointApprovalResult: { accepted: false, pending: true }
    });
    const result = await runIntent(file, adapters);

    expect(result.status).toBe('waiting-for-input');
    expect(result.pendingCheckpoint).toEqual({
      id: 'approve-plan',
      kind: 'approval',
      message: 'Approve?',
      data: { ok: true }
    });
  });
});
