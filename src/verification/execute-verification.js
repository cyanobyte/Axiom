/**
 * Purpose: Execute a runtime verification check against a declared ID.
 * Responsibilities:
 * - Resolve the static verification declaration.
 * - Run the authored verification callback.
 * - Store a normalized verification record on the run result.
 */
import { findVerification } from './find-verification.js';
import { formatRuntimeError } from '../runtime/format-runtime-error.js';

/**
 * Execute a declared verification check and record its result.
 *
 * @param {object} definition
 * @param {object} result
 * @param {string} kind
 * @param {string} verificationId
 * @param {object} spec
 * @param {object} [options={}]
 * @returns {Promise<object>}
 */
export async function executeVerification(definition, result, kind, verificationId, spec, options = {}) {
  const declaration = findVerification(definition, kind, verificationId);
  const check = await spec.run();

  const record = {
    verificationId,
    kind,
    status: check.passed ? 'passed' : 'failed',
    covers: declaration.covers,
    evidence: check.evidence === undefined ? [] : [check.evidence],
    diagnostics: check.diagnostics ?? [],
    severity: spec.severity ?? 'error'
  };

  result.verification.push(record);

  if (record.status === 'failed' && record.severity === 'error') {
    result.status = 'failed';
    result.diagnostics.push(
      formatRuntimeError({
        kind: 'verification',
        stepId: options.stepId,
        message: `${capitalize(kind)} verification failed: ${verificationId}.`
      })
    );
  }

  return record;
}

function capitalize(value) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
