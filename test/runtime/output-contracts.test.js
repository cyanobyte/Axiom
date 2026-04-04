import { describe, expect, it } from 'vitest';
import {
  buildFileGenerationPrompt,
  buildJsonContractPrompt,
  buildStructuredJsonPrompt
} from '../../src/runtime/output-contracts.js';

describe('buildJsonContractPrompt', () => {
  it('appends explicit JSON-only instructions and the expected shape', () => {
    const prompt = buildJsonContractPrompt('Return a planner result.', {
      includesLoadCounter: 'boolean',
      includesIncrementCounter: 'boolean'
    });

    expect(prompt).toContain('Return only valid JSON');
    expect(prompt).toContain('"includesLoadCounter"');
  });

  it('builds a file generation prompt with structured context', () => {
    const prompt = buildFileGenerationPrompt({
      instructions: 'Generate the minimal files for this sample.',
      context: {
        plan: {
          usesNodeCli: true
        }
      },
      files: [{ path: 'package.json', content: 'string' }]
    });

    expect(prompt).toContain('Generate the minimal files for this sample.');
    expect(prompt).toContain('Plan:');
    expect(prompt).toContain('"usesNodeCli": true');
    expect(prompt).toContain('"package.json"');
  });

  it('builds a structured JSON prompt with typed output shape', () => {
    const prompt = buildStructuredJsonPrompt({
      instructions: 'Create a concise implementation plan.',
      context: {
        brief: {
          summary: 'sample brief'
        }
      },
      shape: {
        usesNodeCli: true,
        includesTests: true
      }
    });

    expect(prompt).toContain('Create a concise implementation plan.');
    expect(prompt).toContain('Brief:');
    expect(prompt).toContain('"summary": "sample brief"');
    expect(prompt).toContain('"includesTests": true');
  });
});
