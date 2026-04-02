export function applyIntentRevision(result, revision) {
  result.status = 'terminated-requires-rerun';
  result.intentRevision = revision;
  return revision;
}
