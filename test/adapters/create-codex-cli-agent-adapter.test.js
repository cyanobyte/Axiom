import { describe, expect, it } from 'vitest';
import { createCodexCliAgentAdapter } from '../../src/adapters/providers/create-codex-cli-agent-adapter.js';

describe('createCodexCliAgentAdapter', () => {
  it('runs codex exec with stdin prompt content and returns stdout text', async () => {
    const calls = [];
    const adapter = createCodexCliAgentAdapter('planner', {
      model: 'gpt-5.4-codex',
      runner: async (spec) => {
        calls.push(spec);
        return { stdout: 'READY\n', stderr: '', exitCode: 0 };
      }
    });

    const result = await adapter.run({
      prompt: 'Return READY.'
    });

    expect(result).toBe('READY');
    expect(calls).toEqual([
      {
        command: 'codex',
        args: ['exec', '-', '--skip-git-repo-check', '--model', 'gpt-5.4-codex'],
        cwd: process.cwd(),
        input: 'Return READY.'
      }
    ]);
  });

  it('raises a clear error when the CLI exits non-zero', async () => {
    const adapter = createCodexCliAgentAdapter('coder', {
      runner: async () => ({ stdout: '', stderr: 'boom', exitCode: 1 })
    });

    await expect(adapter.run({ prompt: 'Write code.' })).rejects.toThrow(
      'codex CLI request failed for coder: boom'
    );
  });
});
