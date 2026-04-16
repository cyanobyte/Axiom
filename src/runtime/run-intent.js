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
import { createEventStream } from './create-event-stream.js';
import { formatRuntimeError } from './format-runtime-error.js';
import { auditAppSecurity } from '../security/audit-app-security.js';
import { runAiSecurityReview } from '../security/run-ai-security-review.js';

/**
 * Execute an authored intent file with an adapter set.
 *
 * @param {object} file
 * @param {object} adapters
 * @returns {Promise<object>}
 */
export async function runIntent(file, adapters, options = {}) {
  const result = createRunResult(file.definition);
  const events = createEventStream(result, options.onEvent);
  const diagnostics = checkReadiness(file.definition);

  if (diagnostics.length > 0) {
    result.status = 'invalid';
    result.diagnostics.push(...diagnostics);
    return result;
  }

  const state = {
    stepResults: result.stepResults,
    stepMap: new Map(),
    currentStepId: undefined,
    events,
    signal: options.signal,
    materializedFiles: []
  };

  const ctx = createRunContext(file, adapters, state, result);
  try {
    result.finalValue = await file.runFn(ctx);
    await applyAppSecurityAudit(file.definition.security?.app, result, state.materializedFiles, adapters);
  } catch (error) {
    result.status = error.code === 'INTERRUPTED' ? 'interrupted' : 'failed';
    result.diagnostics.push(formatRuntimeError(error));
  }

  return result;
}

async function applyAppSecurityAudit(appSecurity, result, files, adapters) {
  if (!appSecurity || !result.securityReport?.app) {
    return;
  }

  const audit = auditAppSecurity(appSecurity, files);
  const aiReview = await runAiSecurityReview({ adapters, appSecurity, files });

  result.securityReport.app.staticChecks = audit.staticChecks;
  result.securityReport.app.aiReview = aiReview;

  const failed = audit.finalStatus === 'failed' || aiReview.status === 'failed';
  const warned = aiReview.status === 'warning';

  if ((failed || warned) && appSecurity.violationAction === 'warn') {
    result.securityReport.app.finalStatus = 'warning';
    result.diagnostics.push({
      kind: 'security',
      message: 'Application security policy produced warnings.',
      nextAction: 'Review securityReport.app findings before release.'
    });
    return;
  }

  result.securityReport.app.finalStatus = failed ? 'failed' : warned ? 'warning' : 'pass';

  if (failed) {
    result.status = 'failed';
    result.diagnostics.push({
      kind: 'security',
      message: 'Application security policy failed.',
      nextAction: 'Fix generated code or adjust the declared security.app policy.'
    });
  }
}
