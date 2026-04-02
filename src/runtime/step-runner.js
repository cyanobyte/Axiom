/**
 * Purpose: Execute one named runtime step and record its result.
 * Responsibilities:
 * - Preserve source-order step execution.
 * - Normalize step outputs into the run result.
 * - Keep a step map for later step-result lookups.
 */
/**
 * Run a named workflow step and store its structured result.
 *
 * @param {object} state
 * @param {string} stepId
 * @param {Function} run
 * @returns {Promise<unknown>}
 */
export async function runStep(state, stepId, run) {
  const startedAt = new Date().toISOString();
  const output = await run();
  const finishedAt = new Date().toISOString();

  const record = {
    stepId,
    status: 'passed',
    startedAt,
    finishedAt,
    output,
    artifacts: [],
    diagnostics: [],
    mutations: []
  };

  state.stepResults.push(record);
  state.stepMap.set(stepId, output);
  return output;
}
