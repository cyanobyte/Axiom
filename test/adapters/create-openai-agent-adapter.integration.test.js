import { describe, expect, it } from 'vitest';
import { createOpenAIAgentAdapter } from '../../src/adapters/providers/create-openai-agent-adapter.js';

const hasLiveConfig = Boolean(process.env.OPENAI_API_KEY);

describe('createOpenAIAgentAdapter live execution', () => {
  it.skipIf(!hasLiveConfig)('calls the live provider and returns text output', async () => {
    const adapter = createOpenAIAgentAdapter('planner', {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-5.4'
    });

    const result = await adapter.run({
      prompt: 'Return exactly the word READY.'
    });

    expect(typeof result).toBe('string');
    expect(result).toContain('READY');
  });
});
