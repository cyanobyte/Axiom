import { describe, expect, it } from 'vitest';
import { parseJsonOutput } from '../../src/adapters/providers/parse-json-output.js';

describe('parseJsonOutput', () => {
  it('returns parsed JSON objects from provider stdout', () => {
    expect(parseJsonOutput('{"ok":true}')).toEqual({ ok: true });
  });

  it('throws a clear error for non-JSON output', () => {
    expect(() => parseJsonOutput('not json', 'planner')).toThrow(
      'Provider output for planner was not valid JSON'
    );
  });
});
