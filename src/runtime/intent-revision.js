/**
 * Purpose: Record that the current run proposed an intent revision.
 * Responsibilities:
 * - Mark the run as requiring a rerun.
 * - Attach the revision proposal to the run result.
 * - Keep revised intent from taking effect mid-run.
 */

/**
 * Apply an intent revision record to the current run result.
 *
 * @param {object} result
 * @param {object} revision
 * @returns {object}
 */
export function applyIntentRevision(result, revision) {
  result.status = 'terminated-requires-rerun';
  result.intentRevision = revision;
  return revision;
}
