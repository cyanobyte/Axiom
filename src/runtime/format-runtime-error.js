/**
 * Purpose: Normalize runtime failures into one actionable diagnostic shape.
 * Responsibilities:
 * - Classify failures by kind for user-facing reporting.
 * - Preserve the active step when available.
 * - Attach a clear next action for rerun-oriented workflows.
 */

/**
 * Convert a runtime failure into a normalized diagnostic.
 *
 * @param {object|Error} error
 * @returns {object}
 */
export function formatRuntimeError(error) {
  const kind = error.kind ?? inferErrorKind(error);

  return {
    kind,
    stepId: error.stepId,
    message: error.message,
    nextAction: error.nextAction ?? defaultNextAction(kind, error)
  };
}

function inferErrorKind(error) {
  if (error.code === 'INTERRUPTED') {
    return 'runtime';
  }

  if (error.message?.startsWith('Worker ')) {
    return 'worker';
  }

  return 'runtime';
}

function defaultNextAction(kind, error) {
  if (error.code === 'INTERRUPTED') {
    return 'Rerun the intent file when you are ready to continue.';
  }

  if (kind === 'worker') {
    return 'Inspect the failing command output and update the .axiom.js source or generated files before rerunning.';
  }

  if (kind === 'verification') {
    return 'Update the intent, generated files, or verification evidence so the declared outcome passes.';
  }

  if (kind === 'readiness') {
    return 'Update the .axiom.js source so the missing execution detail is declared before rerunning.';
  }

  return 'Review the failing step and update the .axiom.js source before rerunning.';
}
