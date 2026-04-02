import { describe, expect, it } from 'vitest';
import { createClaudeCliAgentAdapter } from '../../src/adapters/providers/create-claude-cli-agent-adapter.js';

describe('createClaudeCliAgentAdapter', () => {
  it('runs claude print mode and returns stdout text', async () => {
    const calls = [];
    const adapter = createClaudeCliAgentAdapter('briefing', {
      model: 'sonnet',
      runner: async (spec) => {
        calls.push(spec);
        return { stdout: 'BRIEF\n', stderr: '', exitCode: 0 };
      }
    });

    const result = await adapter.run({
      prompt: 'Summarize the intent.'
    });

    expect(result).toBe('BRIEF');
    expect(calls).toEqual([
      {
        command: 'claude',
        args: ['--print', '--output-format', 'text', '--model', 'sonnet', 'Summarize the intent.'],
        cwd: process.cwd(),
        input: ''
      }
    ]);
  });
});
