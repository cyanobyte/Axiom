/**
 * Purpose: Load sibling runtime configuration for an authored intent file.
 * Responsibilities:
 * - Resolve `axiom.config.js` next to the target intent file.
 * - Import the config as normal JavaScript.
 * - Fail clearly when the sibling config file is missing.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Load the default sibling runtime config for an intent file.
 *
 * @param {string} intentFilePath
 * @returns {Promise<object>}
 */
export async function loadRuntimeConfig(intentFilePath) {
  const directory = path.dirname(path.resolve(intentFilePath));
  const configPath = path.join(directory, 'axiom.config.js');

  try {
    const module = await import(pathToFileURL(configPath).href);
    return module.default;
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' || String(error.message).includes(configPath)) {
      throw new Error('Missing runtime config: axiom.config.js');
    }

    throw error;
  }
}
