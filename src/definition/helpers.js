export function must(id, text) {
  return { id, text, severity: 'error' };
}

export function should(id, text) {
  return { id, text, severity: 'warn' };
}

export function outcome(id, text) {
  return { id, text };
}

export function verify(id, covers) {
  return { id, covers };
}
