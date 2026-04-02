import { executeVerification } from '../verification/execute-verification.js';
import { runStep } from './step-runner.js';

export function createRunContext(file, adapters, state, result) {
  return {
    meta: file.definition.meta,
    intent: file.definition,
    step(stepId, run) {
      return runStep(state, stepId, run);
    },
    stepResult(stepId) {
      return state.stepMap.get(stepId);
    },
    workspace: adapters.workspace,
    artifact(path) {
      return adapters.artifacts.read(path);
    },
    agent(name) {
      return adapters.ai.agent(name);
    },
    worker(name) {
      return adapters.workers.worker(name);
    },
    verify: {
      intent(verificationId, spec) {
        return executeVerification(file.definition, result, 'intent', verificationId, spec);
      },
      outcome(verificationId, spec) {
        return executeVerification(file.definition, result, 'outcome', verificationId, spec);
      }
    },
    checkpoint: adapters.checkpoint
  };
}
