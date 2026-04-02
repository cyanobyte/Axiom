import { runStep } from './step-runner.js';

export function createRunContext(file, adapters, state) {
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
    verify: adapters.verify,
    checkpoint: adapters.checkpoint
  };
}
