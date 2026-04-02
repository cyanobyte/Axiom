/**
 * Purpose: Load an authored `.axiom.js` file from disk.
 * Responsibilities:
 * - Resolve the file path to an importable module URL.
 * - Ensure the module exports a valid intent file as its default export.
 * - Return the loaded authored runtime object unchanged.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Load an authored intent file by path.
 *
 * @param {string} filePath
 * @returns {Promise<object>}
 */
export async function loadIntentFile(filePath) {
  const absolutePath = path.resolve(filePath);
  const module = await import(pathToFileURL(absolutePath).href);

  if (!module.default || module.default.kind !== 'intent-file') {
    throw new Error(`Intent module did not export a valid intent file: ${filePath}`);
  }

  return module.default;
}
