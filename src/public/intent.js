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

export function intent(definition, runFn) {
  const validated = validateDefinition(structuredClone(definition));
  return {
    kind: 'intent-file',
    definition: deepFreeze(validated),
    runFn
  };
}
