/**
 * Purpose: Build compact helper records for authored intent definitions.
 * Responsibilities:
 * - Create normalized constraint, outcome, and verification entries.
 * - Keep authored `.axiom.js` files concise and readable.
 * - Preserve a stable data shape for runtime validation.
 */

/**
 * Create a required constraint record.
 *
 * @param {string} id
 * @param {string} text
 * @returns {object}
 */
export function must(id, text) {
  return { id, text, severity: 'error' };
}

/**
 * Create a warning-level constraint record.
 *
 * @param {string} id
 * @param {string} text
 * @returns {object}
 */
export function should(id, text) {
  return { id, text, severity: 'warn' };
}

/**
 * Create an outcome record.
 *
 * @param {string} id
 * @param {string} text
 * @returns {object}
 */
export function outcome(id, text) {
  return { id, text };
}

/**
 * Create a verification declaration record.
 *
 * @param {string} id
 * @param {string[]} covers
 * @returns {object}
 */
export function verify(id, covers) {
  return { id, covers };
}
