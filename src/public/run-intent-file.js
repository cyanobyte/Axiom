/**
 * Purpose: Execute an authored intent file through the default file-based runtime path.
 * Responsibilities:
 * - Resolve the authored intent file path.
 * - Load sibling runtime config and validate it.
 * - Build configured adapters and execute the runtime.
 */
import path from 'node:path';
import { loadIntentFile } from './load-intent-file.js';
import { loadRuntimeConfig } from './load-runtime-config.js';
import { validateRuntimeConfig } from '../config/validate-runtime-config.js';
import { createConfiguredAdapters } from '../adapters/create-configured-adapters.js';
import { runIntent } from '../runtime/run-intent.js';

/**
 * Run an authored intent file by loading its sibling runtime config automatically.
 *
 * @param {string} intentFilePath
 * @param {object} [options={}]
 * @returns {Promise<object>}
 */
export async function runIntentFile(intentFilePath, options = {}) {
  const resolvedPath = path.resolve(intentFilePath);
  const file = await loadIntentFile(resolvedPath);
  const runtimeConfig = validateRuntimeConfig(await loadRuntimeConfig(resolvedPath));
  const adapters = createConfiguredAdapters({
    intentFilePath: resolvedPath,
    runtimeConfig
  });

  return runIntent(file, adapters, options);
}
