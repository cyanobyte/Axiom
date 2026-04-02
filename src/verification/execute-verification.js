import { findVerification } from './find-verification.js';

export async function executeVerification(definition, result, kind, verificationId, spec) {
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
  return record;
}
