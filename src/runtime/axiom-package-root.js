/**
 * Purpose: Resolve the Axiom package root from inside Axiom's own source tree.
 * Responsibilities:
 * - Return the absolute path of the directory that contains package.json.
 * - Cache the resolved value for the process lifetime.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let cachedRoot;

export function getAxiomPackageRoot() {
  if (cachedRoot) {
    return cachedRoot;
  }

  const thisFile = fileURLToPath(import.meta.url);
  cachedRoot = path.resolve(path.dirname(thisFile), '../..');
  return cachedRoot;
}
