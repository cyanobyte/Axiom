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
  state.currentStepId = stepId;
  state.events.emit({ type: 'step.started', stepId });

  try {
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
    state.events.emit({ type: 'step.finished', stepId, status: 'passed' });
    return output;
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const record = {
      stepId,
      status: 'failed',
      startedAt,
      finishedAt,
      output: error.stepOutput,
      artifacts: [],
      diagnostics: [
        {
          message: error.message
        }
      ],
      mutations: []
    };

    state.stepResults.push(record);
    error.stepId = stepId;
    state.events.emit({
      type: 'step.finished',
      stepId,
      status: 'failed',
      error: error.message
    });
    throw error;
  } finally {
    state.currentStepId = undefined;
  }
}
