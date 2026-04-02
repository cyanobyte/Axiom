/**
 * Purpose: Construct the immutable authored intent-file object.
 * Responsibilities:
 * - Validate the declarative definition before runtime use.
 * - Deep-freeze the validated definition for predictable execution.
 * - Pair the definition with its runtime callback.
 */
import { validateDefinition } from '../definition/validate-definition.js';

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
  }
  return value;
}

/**
 * Create an authored intent file from a definition and runtime callback.
 *
 * @param {object} definition
 * @param {Function} runFn
 * @returns {object}
 */
export function intent(definition, runFn) {
  const validated = validateDefinition(structuredClone(definition));
  return {
    kind: 'intent-file',
    definition: deepFreeze(validated),
    runFn
  };
}
