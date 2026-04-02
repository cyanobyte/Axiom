import { requestApproval } from './checkpoints.js';
import { applyIntentRevision } from './intent-revision.js';
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
    verification: {
      summary() {
        const total = result.verification.length;
        const passed = result.verification.filter((item) => item.status === 'passed').length;
        const failed = result.verification.filter((item) => item.status === 'failed').length;

        return {
          total,
          passed,
          failed
        };
      }
    },
    checkpoint: {
      approval(checkpointId, spec) {
        return requestApproval(result, adapters, checkpointId, spec);
      },
      choice(checkpointId, spec) {
        return adapters.checkpoint.choice(checkpointId, spec);
      },
      input(checkpointId, spec) {
        return adapters.checkpoint.input(checkpointId, spec);
      }
    },
    reviseIntent(revision) {
      return applyIntentRevision(result, revision);
    }
  };
}
