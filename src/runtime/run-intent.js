import { createRunResult } from './result-model.js';
import { createRunContext } from './create-run-context.js';
import { checkReadiness } from './check-readiness.js';

export async function runIntent(file, adapters) {
  const result = createRunResult();
  const diagnostics = checkReadiness(file.definition);

  if (diagnostics.length > 0) {
    result.status = 'invalid';
    result.diagnostics.push(...diagnostics);
    return result;
  }

  const state = {
    stepResults: result.stepResults,
    stepMap: new Map()
  };

  const ctx = createRunContext(file, adapters, state, result);
  result.finalValue = await file.runFn(ctx);
  return result;
}
