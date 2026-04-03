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

  it('fails preflight before execution when a full-stack web app is underspecified', async () => {
    let executed = false;

    const file = intent(
      {
        id: 'underspecified-webapp',
        meta: { title: 'Underspecified Web App' },
        what: { capability: 'webapp', description: 'A web app missing execution details' },
        why: { problem: 'Need preflight', value: 'Avoid invented architecture' },
        scope: { includes: [], excludes: [] },
        runtime: { languages: ['javascript'], targets: ['node', 'browser'], platforms: ['web'] },
        build: { system: 'npm', test_runner: 'npm' },
        constraints: [must('must-exist', 'Constraint exists')],
        outcomes: [outcome('works', 'It works')],
        verification: { intent: [], outcome: [] },
        web: {
          kind: 'full-stack',
          frontend: {},
          api: { style: 'rest', endpoints: [] }
        }
      },
      async (ctx) => {
        executed = true;
        await ctx.step('should-not-run', () => ({ ok: true }));
        return { ok: true };
      }
    );

    const result = await runIntent(file, createTestAdapters());

    expect(executed).toBe(false);
    expect(result.status).toBe('invalid');
    expect(result.stepResults).toEqual([]);
    expect(result.finalValue).toBeUndefined();
    expect(result.diagnostics.map((item) => item.message)).toEqual([
      'Missing build.commands.test for full-stack web app execution.',
      'Missing web.frontend.framework for full-stack web app execution.',
      'Missing web.api.endpoints for full-stack web app execution.',
      'Missing architecture.components for full-stack web app execution.'
    ]);
  });

  it('marks the run as failed when a worker step returns a nonzero exit code', async () => {
    const file = intent(
      {
        id: 'failing-shell-step',
        meta: { title: 'Failing Shell Step' },
        what: { capability: 'sample', description: 'A sample runtime with a failing shell step' },
        why: { problem: 'Need shell failure handling', value: 'Nonzero exits must fail the run' },
        scope: { includes: [], excludes: [] },
        runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
        constraints: [must('must-exist', 'Constraint exists')],
        outcomes: [outcome('works', 'It works')],
        verification: { intent: [], outcome: [] },
        library: { kind: 'package' }
      },
      async (ctx) => {
        await ctx.step('test', () =>
          ctx.worker('shell').exec({
            command: 'npm test',
            cwd: '/tmp/axiom-test'
          })
        );

        return { ok: true };
      }
    );

    const adapters = createTestAdapters();
    adapters.workers.worker = () => ({
      async exec(spec) {
        return {
          ...spec,
          stdout: '',
          stderr: 'failure',
          exitCode: 1
        };
      }
    });

    const result = await runIntent(file, adapters);

    expect(result.status).toBe('failed');
    expect(result.finalValue).toBeUndefined();
    expect(result.stepResults).toHaveLength(1);
    expect(result.stepResults[0]).toMatchObject({
      stepId: 'test',
      status: 'failed'
    });
    expect(result.stepResults[0].diagnostics[0]).toEqual({
      kind: 'worker',
      stepId: 'test',
      message: 'Worker shell failed with exit code 1.',
      nextAction: 'Inspect the failing command output and update the .axiom.js source or generated files before rerunning.'
    });
    expect(result.diagnostics[0]).toEqual({
      kind: 'worker',
      stepId: 'test',
      message: 'Worker shell failed with exit code 1.',
      nextAction: 'Inspect the failing command output and update the .axiom.js source or generated files before rerunning.'
    });
  });

  it('marks the run as interrupted when a worker step is aborted', async () => {
    const file = intent(
      {
        id: 'interrupted-shell-step',
        meta: { title: 'Interrupted Shell Step' },
        what: { capability: 'sample', description: 'A sample runtime with an interrupted shell step' },
        why: { problem: 'Need interrupt handling', value: 'Interrupted runs must be reported clearly' },
        scope: { includes: [], excludes: [] },
        runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
        constraints: [must('must-exist', 'Constraint exists')],
        outcomes: [outcome('works', 'It works')],
        verification: { intent: [], outcome: [] },
        library: { kind: 'package' }
      },
      async (ctx) => {
        await ctx.step('test', () =>
          ctx.worker('shell').exec({
            command: 'npm test',
            cwd: '/tmp/axiom-test'
          })
        );

        return { ok: true };
      }
    );

    const adapters = createTestAdapters();
    adapters.workers.worker = () => ({
      async exec() {
        const error = new Error('Command interrupted by user.');
        error.code = 'INTERRUPTED';
        throw error;
      }
    });

    const result = await runIntent(file, adapters);

    expect(result.status).toBe('interrupted');
    expect(result.finalValue).toBeUndefined();
    expect(result.diagnostics[0]).toEqual({
      kind: 'runtime',
      stepId: 'test',
      message: 'Command interrupted by user.',
      nextAction: 'Rerun the intent file when you are ready to continue.'
    });
  });
});
