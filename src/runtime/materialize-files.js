/**
 * Purpose: Materialize generated file outputs into the active workspace.
 * Responsibilities:
 * - Take structured file results from generation steps.
 * - Write each generated file through the workspace adapter.
 * - Keep file creation logic out of authored workflow code.
 */

/**
 * Write generated files into the configured workspace.
 *
 * @param {object} workspace
 * @param {Array<{path: string, content: string}>} [files=[]]
 * @returns {Promise<void>}
 */
export async function materializeFiles(workspace, files = []) {
  for (const file of files) {
    await workspace.write(file.path, file.content);
  }
}
