import { createRunResult } from './result-model.js';
import { createRunContext } from './create-run-context.js';

export async function runIntent(file, adapters) {
  const result = createRunResult();
  const state = {
    stepResults: result.stepResults,
    stepMap: new Map()
  };

  const ctx = createRunContext(file, adapters, state, result);
  result.finalValue = await file.runFn(ctx);
  return result;
}
