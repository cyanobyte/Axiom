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

      result.events.push(emitted);
      listener(emitted);
    }
  };
}
