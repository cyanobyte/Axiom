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
