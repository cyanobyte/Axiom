/**
 * Purpose: Execute an authored intent file through the default file-based runtime path.
 * Responsibilities:
 * - Resolve the authored intent file path.
 * - Load sibling runtime config and validate it.
 * - Build configured adapters and execute the runtime.
 */
import path from 'node:path';
import { loadIntentFile } from './load-intent-file.js';
import { loadRuntimeConfig } from './load-runtime-config.js';
import { validateRuntimeConfig } from '../config/validate-runtime-config.js';
import { createConfiguredAdapters } from '../adapters/create-configured-adapters.js';
import { runIntent } from '../runtime/run-intent.js';
import { createHealthReport } from '../runtime/create-health-report.js';
import {
  clearGeneratedFiles,
  readBuildState,
  writeBuildMetadata
} from '../runtime/build-metadata.js';

/**
 * Run an authored intent file by loading its sibling runtime config automatically.
 *
 * @param {string} intentFilePath
 * @param {object} [options={}]
 * @returns {Promise<object>}
 */
export async function runIntentFile(intentFilePath, options = {}) {
  const resolvedPath = path.resolve(intentFilePath);
  const file = await loadIntentFile(resolvedPath);
  const runtimeConfig = validateRuntimeConfig(await loadRuntimeConfig(resolvedPath));
  const adapters = createConfiguredAdapters({
    intentFilePath: resolvedPath,
    runtimeConfig
  });

  const buildState = await readBuildState(
    adapters.workspace.root(),
    file.definition.meta.version
  );

  if (buildState.status === 'stale') {
    await clearGeneratedFiles(adapters.workspace, buildState.generatedFiles);
  }

  const result = await runIntent(file, adapters, {
    onEvent: options.onEvent,
    signal: options.signal
  });

  if (result.status === 'passed') {
    await writeBuildMetadata(adapters.workspace, {
      intentVersion: file.definition.meta.version,
      generatedFiles: adapters.workspace.getWrittenFiles?.() ?? []
    });
  }

  result.healthReport = createHealthReport({
    intentFile: resolvedPath,
    sourceVersion: file.definition.meta.version,
    builtVersion:
      result.status === 'passed'
        ? file.definition.meta.version
        : buildState.previousVersion,
    result,
    generatedFiles: adapters.workspace.getWrittenFiles?.() ?? buildState.generatedFiles
  });

  return result;
}
