export function createRunResult() {
  return {
    status: 'passed',
    stepResults: [],
    verification: [],
    diagnostics: [],
    artifacts: [],
    finalValue: undefined,
    pendingCheckpoint: undefined,
    intentRevision: undefined
  };
}
