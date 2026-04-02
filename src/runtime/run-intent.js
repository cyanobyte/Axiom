/**
 * Purpose: Execute an authored intent file with configured runtime adapters.
 * Responsibilities:
 * - Run readiness checks before any workflow step executes.
 * - Create run state and the authored runtime context.
 * - Capture the final workflow return value into the structured run result.
 */
import { createRunResult } from './result-model.js';
import { createRunContext } from './create-run-context.js';
import { checkReadiness } from './check-readiness.js';

/**
 * Execute an authored intent file with an adapter set.
 *
 * @param {object} file
 * @param {object} adapters
 * @returns {Promise<object>}
 */
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
