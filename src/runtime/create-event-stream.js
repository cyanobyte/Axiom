/**
 * Purpose: Emit live runtime events to listeners and the structured result.
 * Responsibilities:
 * - Timestamp emitted events consistently.
 * - Broadcast events to an optional live listener.
 * - Preserve emitted events on the final run result for debugging.
 */

/**
 * Create an event stream that records and forwards runtime events.
 *
 * @param {object} result
 * @param {Function} [listener]
 * @returns {object}
 */
export function createEventStream(result, listener = () => {}) {
  return {
    emit(event) {
      const emitted = {
        timestamp: new Date().toISOString(),
        ...event
      };

      listener(emitted);

      const stored = compactStoredEvent(emitted);
      if (stored) {
        result.events.push(stored);
      }
    }
  };
}

function compactStoredEvent(event) {
  if (event.type !== 'step.output') {
    return event;
  }

  if (event.visibility === 'noise') {
    return null;
  }

  if (event.visibility === 'result') {
    return compactResultOutputEvent(event);
  }

  return {
    timestamp: event.timestamp,
    type: event.type,
    stepId: event.stepId,
    source: event.source,
    visibility: event.visibility,
    summary: summarizeChunk(event.chunk)
  };
}

function compactResultOutputEvent(event) {
  const parsed = parseChunkJson(event.chunk);
  if (parsed !== undefined) {
    return {
      timestamp: event.timestamp,
      type: event.type,
      stepId: event.stepId,
      source: event.source,
      visibility: event.visibility,
      summary: 'structured result',
      data: parsed
    };
  }

  return {
    timestamp: event.timestamp,
    type: event.type,
    stepId: event.stepId,
    source: event.source,
    visibility: event.visibility,
    summary: summarizeChunk(event.chunk)
  };
}

function summarizeChunk(chunk = '') {
  const trimmed = String(chunk).trim();
  if (trimmed.length <= 120) {
    return trimmed;
  }

  return `${trimmed.slice(0, 117)}...`;
}

function parseChunkJson(chunk) {
  try {
    return JSON.parse(String(chunk));
  } catch {
    return undefined;
  }
}
