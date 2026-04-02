import path from 'node:path';
import fs from 'node:fs/promises';

export function createLocalWorkspaceAdapter(rootPath) {
  return {
    root() {
      return rootPath;
    },
    async read(filePath) {
      return fs.readFile(path.join(rootPath, filePath), 'utf8');
    },
    async write(filePath, content) {
      await fs.writeFile(path.join(rootPath, filePath), content, 'utf8');
    },
    async patch() {
      throw new Error('Workspace patching not implemented yet');
    }
  };
}
