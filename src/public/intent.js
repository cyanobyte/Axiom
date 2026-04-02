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
  return {
    kind: 'intent-file',
    definition: deepFreeze(structuredClone(definition)),
    runFn
  };
}
