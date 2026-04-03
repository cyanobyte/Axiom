/**
 * Purpose: Track the last successful generated build for a workspace.
 * Responsibilities:
 * - Record the source intent version and generated file list.
 * - Detect when generated output is stale for the current intent version.
 * - Clear previously generated files before a clean rebuild.
 */
import path from 'node:path';
import fs from 'node:fs/promises';

const BUILD_METADATA_FILE = '.axiom-build.json';

/**
 * Read the last build metadata from a workspace root.
 *
 * @param {string} workspaceRoot
 * @returns {Promise<object|null>}
 */
export async function readBuildMetadata(workspaceRoot) {
  try {
    const content = await fs.readFile(path.join(workspaceRoot, BUILD_METADATA_FILE), 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

/**
 * Compare stored build metadata to the active intent version.
 *
 * @param {string} workspaceRoot
 * @param {string} intentVersion
 * @returns {Promise<object>}
 */
export async function readBuildState(workspaceRoot, intentVersion) {
  const metadata = await readBuildMetadata(workspaceRoot);

  if (!metadata) {
    return {
      status: 'missing',
      previousVersion: undefined,
      intentVersion,
      generatedFiles: []
    };
  }

  if (metadata.intentVersion !== intentVersion) {
    return {
      status: 'stale',
      previousVersion: metadata.intentVersion,
      intentVersion,
      generatedFiles: metadata.generatedFiles ?? []
    };
  }

  return {
    status: 'current',
    previousVersion: metadata.intentVersion,
    intentVersion,
    generatedFiles: metadata.generatedFiles ?? []
  };
}

/**
 * Remove the files from a stale build before regeneration.
 *
 * @param {object} workspace
 * @param {string[]} generatedFiles
 * @returns {Promise<void>}
 */
export async function clearGeneratedFiles(workspace, generatedFiles) {
  for (const filePath of generatedFiles) {
    await workspace.remove(filePath);
  }

  await workspace.remove(BUILD_METADATA_FILE);
}

/**
 * Write the last successful build metadata into the workspace.
 *
 * @param {object} workspace
 * @param {object} metadata
 * @returns {Promise<void>}
 */
export async function writeBuildMetadata(workspace, metadata) {
  await workspace.write(
    BUILD_METADATA_FILE,
    JSON.stringify(
      {
        ...metadata,
        writtenAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}
