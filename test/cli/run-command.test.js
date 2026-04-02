import { describe, expect, it, vi } from 'vitest';
import { runCommand } from '../../src/cli/run-command.js';

describe('runCommand', () => {
  it('runs an intent file path provided on the command line', async () => {
    const runIntentFile = vi.fn(async () => ({ status: 'passed' }));
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await runCommand(
      ['examples/basic/counter-webapp.axiom.js'],
      { runIntentFile, logger }
    );

    expect(exitCode).toBe(0);
    expect(runIntentFile).toHaveBeenCalledWith('examples/basic/counter-webapp.axiom.js');
  });
});
