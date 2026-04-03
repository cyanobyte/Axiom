import { describe, expect, it, vi } from 'vitest';
import { runCommand } from '../../src/cli/run-command.js';

describe('runCommand', () => {
  it('runs an intent file path provided on the command line', async () => {
    const runIntentFile = vi.fn(async (_filePath, options) => {
      options.onEvent({ type: 'step.started', stepId: 'plan' });
      options.onEvent({ type: 'step.output', stepId: 'plan', chunk: 'working' });
      options.onEvent({ type: 'step.finished', stepId: 'plan', status: 'passed' });
      return { status: 'passed', events: [] };
    });
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await runCommand(
      ['examples/basic/counter-webapp.axiom.js'],
      { runIntentFile, logger }
    );

    expect(exitCode).toBe(0);
    expect(runIntentFile).toHaveBeenCalledWith(
      'examples/basic/counter-webapp.axiom.js',
      expect.objectContaining({
        onEvent: expect.any(Function)
      })
    );
    expect(logger.log).toHaveBeenCalledWith('[step] plan started');
    expect(logger.log).toHaveBeenCalledWith('[output:plan] working');
    expect(logger.log).toHaveBeenCalledWith('[step] plan passed');
  });

  it('filters provider transcript noise in default mode', async () => {
    const runIntentFile = vi.fn(async (_filePath, options) => {
      options.onEvent({ type: 'step.started', stepId: 'plan' });
      options.onEvent({
        type: 'step.output',
        stepId: 'plan',
        source: 'agent:planner',
        chunk: 'OpenAI Codex v0.118.0 (research preview)',
        visibility: 'noise'
      });
      options.onEvent({
        type: 'step.output',
        stepId: 'plan',
        source: 'agent:planner',
        chunk: 'Using `using-superpowers` first',
        visibility: 'noise'
      });
      options.onEvent({
        type: 'step.output',
        stepId: 'plan',
        source: 'agent:planner',
        chunk: 'Planning counter app structure...',
        visibility: 'progress'
      });
      options.onEvent({
        type: 'step.output',
        stepId: 'plan',
        source: 'agent:planner',
        chunk: '{"includesLoadCounter":true}',
        visibility: 'result'
      });
      options.onEvent({ type: 'step.finished', stepId: 'plan', status: 'passed' });
      return { status: 'passed', events: [] };
    });
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await runCommand(
      ['examples/basic/counter-webapp.axiom.js'],
      { runIntentFile, logger }
    );

    expect(exitCode).toBe(0);
    expect(logger.log).not.toHaveBeenCalledWith('[output:plan] OpenAI Codex v0.118.0 (research preview)');
    expect(logger.log).not.toHaveBeenCalledWith('[output:plan] Using `using-superpowers` first');
    expect(logger.log).toHaveBeenCalledWith('[output:plan] Planning counter app structure...');
    expect(logger.log).toHaveBeenCalledWith('[output:plan] {"includesLoadCounter":true}');
  });

  it('prints raw provider transcript in verbose mode', async () => {
    const runIntentFile = vi.fn(async (_filePath, options) => {
      options.onEvent({
        type: 'step.output',
        stepId: 'implement',
        source: 'agent:coder',
        chunk: 'OpenAI Codex v0.118.0 (research preview)',
        visibility: 'noise'
      });
      return { status: 'passed', events: [] };
    });
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await runCommand(
      ['--verbose', 'examples/live-counter/counter-webapp.axiom.js'],
      { runIntentFile, logger }
    );

    expect(exitCode).toBe(0);
    expect(logger.log).toHaveBeenCalledWith('[output:implement] OpenAI Codex v0.118.0 (research preview)');
  });

  it('returns 130 when the run is interrupted by SIGINT', async () => {
    let interruptHandler;
    const runIntentFile = vi.fn(async (_filePath, options) => {
      interruptHandler();
      expect(options.signal.aborted).toBe(true);
      return { status: 'interrupted', events: [], diagnostics: [{ message: 'Run interrupted by user.' }] };
    });
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await runCommand(
      ['examples/live-counter/counter-webapp.axiom.js'],
      {
        runIntentFile,
        logger,
        signalHandlers: {
          register(handler) {
            interruptHandler = handler;
          },
          unregister() {}
        }
      }
    );

    expect(exitCode).toBe(130);
  });

  it('prints concise compiler-style diagnostics for failed runs', async () => {
    const runIntentFile = vi.fn(async () => ({
      status: 'failed',
      diagnostics: [
        {
          kind: 'verification',
          stepId: 'verify',
          message: 'Outcome verification failed: counter-ui-flow.',
          nextAction: 'Update the intent, generated files, or verification evidence so the declared outcome passes.'
        }
      ],
      events: []
    }));
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await runCommand(
      ['examples/live-counter/counter-webapp.axiom.js'],
      { runIntentFile, logger }
    );

    expect(exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      '[error:verification] Outcome verification failed: counter-ui-flow. Next: Update the intent, generated files, or verification evidence so the declared outcome passes.'
    );
  });
});
