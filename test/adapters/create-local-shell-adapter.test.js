import { describe, expect, it } from 'vitest';
import { createLocalShellAdapter } from '../../src/adapters/create-local-shell-adapter.js';

describe('createLocalShellAdapter', () => {
  it('executes a local command and returns stdout, stderr, and exitCode', async () => {
    const shell = createLocalShellAdapter();
    const result = await shell.exec({
      command: 'echo 123',
      cwd: process.cwd()
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('123');
    expect(result.stderr).toBe('');
  });

  it('interrupts a running command when the abort signal is triggered', async () => {
    const shell = createLocalShellAdapter();
    const controller = new AbortController();

    const pending = shell.exec({
      command: 'node -e "setTimeout(() => {}, 5000)"',
      cwd: process.cwd()
    }, {
      signal: controller.signal
    });

    controller.abort();

    await expect(pending).rejects.toMatchObject({
      code: 'INTERRUPTED',
      message: 'Command interrupted by user.'
    });
  });
});
