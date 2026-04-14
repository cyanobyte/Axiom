/**
 * Purpose: Build the runtime `ctx` object used by authored workflow code.
 * Responsibilities:
 * - Expose steps, verification, checkpoints, workspace, and artifact access.
 * - Bridge authored runtime code to configured adapters.
 * - Provide small summary helpers over run state.
 */
import { requestApproval } from './checkpoints.js';
import { applyIntentRevision } from './intent-revision.js';
import { materializeFiles } from './materialize-files.js';
import { buildFileGenerationPrompt, buildStructuredJsonPrompt } from './output-contracts.js';
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
    security: file.definition.security,
    step(stepId, run) {
      return runStep(state, stepId, run);
    },
    stepResult(stepId) {
      return state.stepMap.get(stepId);
    },
    workspace: adapters.workspace,
    materialize: {
      files(files) {
        return materializeFiles(adapters.workspace, files);
      }
    },
    artifact(path) {
      return adapters.artifacts.read(path);
    },
    agent(name) {
      const agent = adapters.ai.agent(name);

      return {
        run(input) {
          return agent.run(input, {
            stepId: state.currentStepId,
            onOutput(output) {
              const event = normalizeStepOutput(output);
              state.events.emit({
                type: 'step.output',
                stepId: state.currentStepId,
                source: `agent:${name}`,
                ...event
              });
            },
            signal: state.signal
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
            onOutput(output) {
              const event = normalizeStepOutput(output);
              state.events.emit({
                type: 'step.output',
                stepId: state.currentStepId,
                source: `worker:${name}`,
                ...event
              });
            },
            signal: state.signal
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
    generate: {
      brief(spec = {}) {
        return adapters.ai.agent(spec.agent ?? 'briefing').run(
          {
            intent: spec.intent ?? file.definition
          },
          {
            stepId: state.currentStepId,
            onOutput(output) {
              const event = normalizeStepOutput(output);
              state.events.emit({
                type: 'step.output',
                stepId: state.currentStepId,
                source: `agent:${spec.agent ?? 'briefing'}`,
                ...event
              });
            },
            signal: state.signal
          }
        );
      },
      plan(spec) {
        return adapters.ai.agent(spec.agent ?? 'planner').run(
          {
            prompt: buildStructuredJsonPrompt({
              instructions: spec.instructions,
              context: spec.context,
              shape: spec.shape
            })
          },
          {
            stepId: state.currentStepId,
            onOutput(output) {
              const event = normalizeStepOutput(output);
              state.events.emit({
                type: 'step.output',
                stepId: state.currentStepId,
                source: `agent:${spec.agent ?? 'planner'}`,
                ...event
              });
            },
            signal: state.signal
          }
        );
      },
      files(spec) {
        return adapters.ai.agent(spec.agent ?? 'coder').run(
          {
            prompt: buildFileGenerationPrompt(spec)
          },
          {
            stepId: state.currentStepId,
            onOutput(output) {
              const event = normalizeStepOutput(output);
              state.events.emit({
                type: 'step.output',
                stepId: state.currentStepId,
                source: `agent:${spec.agent ?? 'coder'}`,
                ...event
              });
            },
            signal: state.signal
          }
        );
      }
    },
    verify: {
      intent(verificationId, spec) {
        return executeVerification(file.definition, result, 'intent', verificationId, spec, {
          stepId: state.currentStepId
        });
      },
      intentShape(verificationId, spec) {
        return executeVerification(
          file.definition,
          result,
          'intent',
          verificationId,
          {
            severity: spec.severity,
            run: async () => {
              const diagnostics = [];

              for (const [key, expected] of Object.entries(spec.expected)) {
                if (spec.value?.[key] !== expected) {
                  diagnostics.push({
                    message: `Expected ${key} to be ${JSON.stringify(expected)}.`
                  });
                }
              }

              return {
                passed: diagnostics.length === 0,
                evidence: spec.value,
                diagnostics
              };
            }
          },
          {
            stepId: state.currentStepId
          }
        );
      },
      outcome(verificationId, spec) {
        return executeVerification(file.definition, result, 'outcome', verificationId, spec, {
          stepId: state.currentStepId
        });
      },
      outcomeReport(verificationId, spec) {
        return executeVerification(
          file.definition,
          result,
          'outcome',
          verificationId,
          {
            severity: spec.severity,
            run: async () => {
              const report = await adapters.artifacts.read(spec.path);
              return {
                passed: spec.passes(report),
                evidence: report,
                diagnostics: spec.diagnostics?.(report) ?? []
              };
            }
          },
          {
            stepId: state.currentStepId
          }
        );
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
      approvePlan(plan, message = 'Approve this plan?') {
        return requestApproval(result, adapters, 'approve-plan', {
          message,
          data: plan
        });
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

/**
 * Normalize runtime output chunks into a structured event payload.
 *
 * @param {string|object} output
 * @returns {{ chunk: string, visibility: string }}
 */
function normalizeStepOutput(output) {
  if (typeof output === 'string') {
    return {
      chunk: output,
      visibility: 'progress'
    };
  }

  return {
    chunk: output?.chunk ?? '',
    visibility: output?.visibility ?? 'progress'
  };
}
