/**
 * Purpose: Record checkpoint state when human approval is required.
 * Responsibilities:
 * - Call the configured checkpoint adapter.
 * - Move the run into a waiting state when approval is pending.
 * - Persist the pending checkpoint summary on the run result.
 */

/**
 * Request an approval checkpoint and record pending state when needed.
 *
 * @param {object} result
 * @param {object} adapters
 * @param {string} checkpointId
 * @param {object} spec
 * @returns {Promise<object>}
 */
export async function requestApproval(result, adapters, checkpointId, spec) {
  const response = await adapters.checkpoint.approval(checkpointId, spec);
  if (response?.pending) {
    result.status = 'waiting-for-input';
    result.pendingCheckpoint = {
      id: checkpointId,
      kind: 'approval',
      message: spec.message,
      data: spec.data
    };
  }
  return response;
}
