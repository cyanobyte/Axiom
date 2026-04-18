import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getAxiomPackageRoot } from '../../src/runtime/axiom-package-root.js';

describe('getAxiomPackageRoot', () => {
  it('returns the directory containing package.json with the Axiom name', () => {
    const root = getAxiomPackageRoot();
    const testDir = path.dirname(fileURLToPath(import.meta.url));
    const expectedRoot = path.resolve(testDir, '../..');

    expect(root).toBe(expectedRoot);
  });

  it('returns the same cached value on repeated calls', () => {
    expect(getAxiomPackageRoot()).toBe(getAxiomPackageRoot());
  });
});
