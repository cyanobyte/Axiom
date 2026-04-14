/**
 * Purpose: Create the normalized run result container.
 * Responsibilities:
 * - Provide stable top-level fields for runtime status, steps, and verification.
 * - Hold checkpoint, revision, artifact, and diagnostic state.
 * - Give workflow execution a consistent mutable result target.
 */
import { createSecurityReport } from '../security/create-security-report.js';

/**
 * Create the initial structured run result object.
 *
 * @param {object} [definition]
 * @returns {object}
 */
export function createRunResult(definition) {
  return {
    status: 'passed',
    stepResults: [],
    events: [],
    verification: [],
    diagnostics: [],
    artifacts: [],
    securityReport: createSecurityReport(definition?.security),
    finalValue: undefined,
    pendingCheckpoint: undefined,
    intentRevision: undefined
  };
}
