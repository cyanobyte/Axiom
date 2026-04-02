/**
 * Purpose: Create the normalized run result container.
 * Responsibilities:
 * - Provide stable top-level fields for runtime status, steps, and verification.
 * - Hold checkpoint, revision, artifact, and diagnostic state.
 * - Give workflow execution a consistent mutable result target.
 */

/**
 * Create the initial structured run result object.
 *
 * @returns {object}
 */
export function createRunResult() {
  return {
    status: 'passed',
    stepResults: [],
    events: [],
    verification: [],
    diagnostics: [],
    artifacts: [],
    finalValue: undefined,
    pendingCheckpoint: undefined,
    intentRevision: undefined
  };
}
