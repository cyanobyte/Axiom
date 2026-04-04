/**
 * Purpose: Create a compact end-of-run health report for human-friendly summaries.
 * Responsibilities:
 * - Summarize run status, steps, verification, and generated output.
 * - Preserve source/build version context for rebuild awareness.
 * - Keep final reporting small and deterministic.
 */

/**
 * Create a health report from a run result and runtime metadata.
 *
 * @param {object} input
 * @param {string} input.intentFile
 * @param {string} input.sourceVersion
 * @param {string|undefined} input.builtVersion
 * @param {object} input.result
 * @param {string[]} [input.generatedFiles=[]]
 * @returns {object}
 */
export function createHealthReport({
  intentFile,
  sourceVersion,
  builtVersion,
  result,
  generatedFiles = []
}) {
  const passedSteps = result.stepResults.filter((step) => step.status === 'passed').length;
  const failedSteps = result.stepResults.filter((step) => step.status === 'failed').length;
  const passedVerification = result.verification.filter((item) => item.status === 'passed').length;
  const failedVerification = result.verification.filter((item) => item.status === 'failed').length;

  return {
    intentFile,
    sourceVersion,
    builtVersion,
    status: result.status,
    steps: {
      total: result.stepResults.length,
      passed: passedSteps,
      failed: failedSteps
    },
    verification: {
      total: result.verification.length,
      passed: passedVerification,
      failed: failedVerification
    },
    generatedFiles: generatedFiles.length
  };
}
