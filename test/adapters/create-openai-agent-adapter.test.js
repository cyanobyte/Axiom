import { describe, expect, it } from 'vitest';
import { createOpenAIAgentAdapter } from '../../src/adapters/providers/create-openai-agent-adapter.js';

describe('createOpenAIAgentAdapter', () => {
  it('requires an api key and model for live provider execution', async () => {
    const adapter = createOpenAIAgentAdapter('planner', {});

    await expect(adapter.run({ intent: { id: 'x' } })).rejects.toThrow(
      'Missing OpenAI API key for planner'
    );
  });
});
