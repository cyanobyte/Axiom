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
  const writtenFiles = new Set();

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
      writtenFiles.add(filePath);
    },
    async remove(filePath) {
      await fs.rm(path.join(rootPath, filePath), {
        recursive: true,
        force: true
      });
    },
    async patch() {
      throw new Error('Workspace patching not implemented yet');
    },
    getWrittenFiles() {
      return Array.from(writtenFiles);
    },
    clearWrittenFiles() {
      writtenFiles.clear();
    }
  };
}
