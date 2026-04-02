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
