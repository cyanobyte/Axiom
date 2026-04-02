export function findVerification(definition, kind, verificationId) {
  const match = definition.verification[kind].find((item) => item.id === verificationId);
  if (!match) {
    throw new Error(`Unknown verification id: ${verificationId}`);
  }
  return match;
}
