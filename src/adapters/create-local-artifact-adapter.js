import path from 'node:path';
import fs from 'node:fs/promises';

export function createLocalArtifactAdapter(workspaceRoot, artifactRoot) {
  const resolvedRoot = path.join(workspaceRoot, artifactRoot);

  return {
    async read(relativePath) {
      const content = await fs.readFile(path.join(resolvedRoot, relativePath), 'utf8');
      return JSON.parse(content);
    }
  };
}
