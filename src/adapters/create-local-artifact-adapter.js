/**
 * Purpose: Read machine-readable verification artifacts from disk.
 * Responsibilities:
 * - Resolve the configured artifact root under the workspace.
 * - Load JSON artifacts by relative path.
 * - Return parsed report data to runtime verification calls.
 */
import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Create an artifact adapter rooted under the workspace.
 *
 * @param {string} workspaceRoot
 * @param {string} artifactRoot
 * @returns {object}
 */
export function createLocalArtifactAdapter(workspaceRoot, artifactRoot) {
  const resolvedRoot = path.join(workspaceRoot, artifactRoot);

  return {
    async read(relativePath) {
      const content = await fs.readFile(path.join(resolvedRoot, relativePath), 'utf8');
      return JSON.parse(content);
    }
  };
}
