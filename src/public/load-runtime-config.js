import path from 'node:path';
import { pathToFileURL } from 'node:url';

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
