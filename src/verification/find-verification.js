/**
 * Purpose: Resolve a declared verification by kind and identifier.
 * Responsibilities:
 * - Look up the declaration in the static intent definition.
 * - Fail clearly when authored runtime code references an unknown ID.
 * - Keep runtime verification aligned with static declaration coverage.
 */

/**
 * Find a verification declaration by kind and ID.
 *
 * @param {object} definition
 * @param {string} kind
 * @param {string} verificationId
 * @returns {object}
 */
export function findVerification(definition, kind, verificationId) {
  const match = definition.verification[kind].find((item) => item.id === verificationId);
  if (!match) {
    throw new Error(`Unknown verification id: ${verificationId}`);
  }
  return match;
}
