/**
 * Purpose: Expose controlled workspace file access for runtime execution.
 * Responsibilities:
 * - Resolve reads and writes under a configured workspace root.
 * - Provide the root path for worker commands.
 * - Keep file operations within an explicit adapter boundary.
 */
import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Create a workspace adapter rooted at a local directory.
 *
 * @param {string} rootPath
 * @returns {object}
 */
export function createLocalWorkspaceAdapter(rootPath) {
  return {
    root() {
      return rootPath;
    },
    async read(filePath) {
      return fs.readFile(path.join(rootPath, filePath), 'utf8');
    },
    async write(filePath, content) {
      const resolvedPath = path.join(rootPath, filePath);
      await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
      await fs.writeFile(resolvedPath, content, 'utf8');
    },
    async patch() {
      throw new Error('Workspace patching not implemented yet');
    }
  };
}
