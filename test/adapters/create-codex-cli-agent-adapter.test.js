import { describe, expect, it } from 'vitest';
import { createCodexCliAgentAdapter } from '../../src/adapters/providers/create-codex-cli-agent-adapter.js';

describe('createCodexCliAgentAdapter', () => {
  it('runs codex exec with stdin prompt content and returns stdout text', async () => {
    const calls = [];
    const adapter = createCodexCliAgentAdapter('planner', {
      model: 'gpt-5.4-codex',
      runner: async (spec) => {
        calls.push(spec);
        return {
          stdout: 'noisy transcript\n',
          stderr: '',
          exitCode: 0,
          lastMessage: 'READY\n'
        };
      }
    });

    const result = await adapter.run({
      prompt: 'Return READY.'
    });

    expect(result).toBe('READY');
    expect(calls).toEqual([
      expect.objectContaining({
        command: 'codex',
        args: [
          'exec',
          '-',
          '--skip-git-repo-check',
          '--model',
          'gpt-5.4-codex',
          '--output-last-message',
          expect.any(String)
        ],
        cwd: process.cwd(),
        input: 'Return READY.'
      })
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

  it('parses JSON output when the provider is configured for structured responses', async () => {
    const adapter = createCodexCliAgentAdapter('planner', {
      output: 'json',
      runner: async () => ({
        stdout: 'noisy transcript\n',
        stderr: '',
        exitCode: 0,
        lastMessage: '{"files":[]}\n'
      })
    });

    await expect(adapter.run({ prompt: 'Return JSON.' })).resolves.toEqual({ files: [] });
  });

  it('classifies codex session banners and skill transcript lines as noise', async () => {
    const chunks = [];
    const adapter = createCodexCliAgentAdapter('planner', {
      runner: async (spec) => {
        spec.onStderr?.('OpenAI Codex v0.118.0 (research preview)\n--------');
        spec.onStderr?.('workdir: /tmp/example\nprovider: openai');
        spec.onStdout?.('Using `using-superpowers` first');
        spec.onStdout?.('exec\n/bin/bash -lc "sed -n ..."');
        spec.onStdout?.('succeeded in 101ms:');
        spec.onStdout?.('Planning counter app structure...');
        return {
          stdout: '',
          stderr: '',
          exitCode: 0,
          lastMessage: 'READY\n'
        };
      }
    });

    await expect(
      adapter.run({ prompt: 'Return READY.' }, {
        onOutput(event) {
          chunks.push(event);
        }
      })
    ).resolves.toBe('READY');

    expect(chunks).toEqual([
      {
        chunk: 'OpenAI Codex v0.118.0 (research preview)\n--------',
        visibility: 'noise'
      },
      {
        chunk: 'workdir: /tmp/example\nprovider: openai',
        visibility: 'noise'
      },
      {
        chunk: 'Using `using-superpowers` first',
        visibility: 'noise'
      },
      {
        chunk: 'exec\n/bin/bash -lc "sed -n ..."',
        visibility: 'noise'
      },
      {
        chunk: 'succeeded in 101ms:',
        visibility: 'noise'
      },
      {
        chunk: 'Planning counter app structure...',
        visibility: 'progress'
      }
    ]);
  });

  it('strips the codex prefix from JSON result chunks and hides token chatter', async () => {
    const chunks = [];
    const adapter = createCodexCliAgentAdapter('planner', {
      runner: async (spec) => {
        spec.onStdout?.('codex\n{"includesLoadCounter":true}');
        spec.onStdout?.('tokens used\n6,785');
        return {
          stdout: '',
          stderr: '',
          exitCode: 0,
          lastMessage: '{"includesLoadCounter":true}\n'
        };
      }
    });

    await expect(
      adapter.run({ prompt: 'Return JSON.' }, {
        onOutput(event) {
          chunks.push(event);
        }
      })
    ).resolves.toBe('{"includesLoadCounter":true}');

    expect(chunks).toEqual([
      {
        chunk: '{"includesLoadCounter":true}',
        visibility: 'result'
      },
      {
        chunk: 'tokens used\n6,785',
        visibility: 'noise'
      }
    ]);
  });

  it('strips the codex prefix before classifying prose transcript noise', async () => {
    const chunks = [];
    const adapter = createCodexCliAgentAdapter('planner', {
      runner: async (spec) => {
        spec.onStdout?.('codex\nI’m using `using-superpowers` first');
        return {
          stdout: '',
          stderr: '',
          exitCode: 0,
          lastMessage: 'READY\n'
        };
      }
    });

    await adapter.run({ prompt: 'Return READY.' }, {
      onOutput(event) {
        chunks.push(event);
      }
    });

    expect(chunks).toEqual([
      {
        chunk: 'I’m using `using-superpowers` first',
        visibility: 'noise'
      }
    ]);
  });
});
