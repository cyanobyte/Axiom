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
});
