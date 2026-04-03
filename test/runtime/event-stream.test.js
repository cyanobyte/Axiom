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

  it('preserves visibility metadata on emitted output events', () => {
    const result = { events: [] };
    const stream = createEventStream(result);

    stream.emit({
      type: 'step.output',
      stepId: 'plan',
      chunk: 'OpenAI Codex',
      visibility: 'noise'
    });

    expect(result.events[0]).toMatchObject({
      type: 'step.output',
      stepId: 'plan',
      chunk: 'OpenAI Codex',
      visibility: 'noise'
    });
  });
});
