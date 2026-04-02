import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function loadIntentFile(filePath) {
  const absolutePath = path.resolve(filePath);
  const module = await import(pathToFileURL(absolutePath).href);

  if (!module.default || module.default.kind !== 'intent-file') {
    throw new Error(`Intent module did not export a valid intent file: ${filePath}`);
  }

  return module.default;
}
