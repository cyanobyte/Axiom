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
});
