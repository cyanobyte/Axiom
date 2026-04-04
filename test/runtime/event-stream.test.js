import { describe, expect, it } from 'vitest';
import { createEventStream } from '../../src/runtime/create-event-stream.js';

describe('createEventStream', () => {
  it('records step lifecycle and output events', () => {
    const result = { events: [] };
    const events = [];
    const stream = createEventStream(result, (event) => events.push(event));

    stream.emit({ type: 'step.started', stepId: 'plan' });
    stream.emit({ type: 'step.output', stepId: 'plan', chunk: 'working' });
    stream.emit({ type: 'step.finished', stepId: 'plan', status: 'passed' });

    expect(events.map((event) => event.type)).toEqual([
      'step.started',
      'step.output',
      'step.finished'
    ]);
    expect(result.events).toHaveLength(3);
  });

  it('does not retain noise output events in stored results', () => {
    const result = { events: [] };
    const stream = createEventStream(result);

    stream.emit({
      type: 'step.output',
      stepId: 'plan',
      chunk: 'OpenAI Codex',
      visibility: 'noise'
    });

    expect(result.events).toEqual([]);
  });

  it('keeps raw output for the live listener but compacts stored output events', () => {
    const result = { events: [] };
    const events = [];
    const stream = createEventStream(result, (event) => events.push(event));

    stream.emit({
      type: 'step.output',
      stepId: 'implement',
      source: 'agent:coder',
      chunk: 'Planning implementation...',
      visibility: 'progress'
    });

    stream.emit({
      type: 'step.output',
      stepId: 'implement',
      source: 'agent:coder',
      chunk: '{"files":[{"path":"package.json","content":"{}"}]}',
      visibility: 'result'
    });

    stream.emit({
      type: 'step.output',
      stepId: 'implement',
      source: 'agent:coder',
      chunk: 'OpenAI Codex v0.118.0',
      visibility: 'noise'
    });

    expect(events).toHaveLength(3);
    expect(events[0].chunk).toBe('Planning implementation...');
    expect(events[1].chunk).toBe('{"files":[{"path":"package.json","content":"{}"}]}');
    expect(events[2].chunk).toBe('OpenAI Codex v0.118.0');

    expect(result.events).toEqual([
      expect.objectContaining({
        type: 'step.output',
        stepId: 'implement',
        source: 'agent:coder',
        visibility: 'progress',
        summary: 'Planning implementation...'
      }),
      expect.objectContaining({
        type: 'step.output',
        stepId: 'implement',
        source: 'agent:coder',
        visibility: 'result',
        summary: 'structured result',
        data: {
          files: [{ path: 'package.json', content: '{}' }]
        }
      })
    ]);
  });
});
