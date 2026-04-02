/**
 * Purpose: Materialize generated file outputs into the active workspace.
 * Responsibilities:
 * - Take structured file results from generation steps.
 * - Write each generated file through the workspace adapter.
 * - Keep file creation logic out of authored workflow code.
 */
import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Write generated files into the configured workspace.
 *
 * @param {object} workspace
 * @param {Array<{path: string, content: string}>} [files=[]]
 * @returns {Promise<void>}
 */
export async function materializeFiles(workspace, files = []) {
  for (const file of files) {
    if (typeof workspace.root === 'function') {
      await fs.mkdir(path.dirname(path.join(workspace.root(), file.path)), { recursive: true });
    }

    await workspace.write(file.path, file.content);
  }
}
