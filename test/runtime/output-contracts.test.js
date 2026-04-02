import { describe, expect, it } from 'vitest';
import { buildJsonContractPrompt } from '../../src/runtime/output-contracts.js';

describe('buildJsonContractPrompt', () => {
  it('appends explicit JSON-only instructions and the expected shape', () => {
    const prompt = buildJsonContractPrompt('Return a planner result.', {
      includesLoadCounter: 'boolean',
      includesIncrementCounter: 'boolean'
    });

    expect(prompt).toContain('Return only valid JSON');
    expect(prompt).toContain('"includesLoadCounter"');
  });
});
