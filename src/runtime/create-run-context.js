/**
 * Purpose: Build the runtime `ctx` object used by authored workflow code.
 * Responsibilities:
 * - Expose steps, verification, checkpoints, workspace, and artifact access.
 * - Bridge authored runtime code to configured adapters.
 * - Provide small summary helpers over run state.
 */
import { requestApproval } from './checkpoints.js';
import { applyIntentRevision } from './intent-revision.js';
import { executeVerification } from '../verification/execute-verification.js';
import { runStep } from './step-runner.js';

/**
 * Create the runtime context passed to an authored workflow callback.
 *
 * @param {object} file
 * @param {object} adapters
 * @param {object} state
 * @param {object} result
 * @returns {object}
 */
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
      const agent = adapters.ai.agent(name);

      return {
        run(input) {
          return agent.run(input, {
            stepId: state.currentStepId,
            onOutput(chunk) {
              state.events.emit({
                type: 'step.output',
                stepId: state.currentStepId,
                source: `agent:${name}`,
                chunk
              });
            }
          });
        }
      };
    },
    worker(name) {
      const worker = adapters.workers.worker(name);

      return {
        async exec(spec) {
          const result = await worker.exec(spec, {
            stepId: state.currentStepId,
            onOutput(chunk) {
              state.events.emit({
                type: 'step.output',
                stepId: state.currentStepId,
                source: `worker:${name}`,
                chunk
              });
            }
          });

          if (typeof result?.exitCode === 'number' && result.exitCode !== 0) {
            const error = new Error(`Worker ${name} failed with exit code ${result.exitCode}.`);
            error.stepOutput = result;
            throw error;
          }

          return result;
        }
      };
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
