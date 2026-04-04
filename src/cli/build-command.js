/**
 * Purpose: Provide the user-facing CLI command handler for building intent files.
 * Responsibilities:
 * - Resolve the local canonical target when no file path is provided.
 * - Execute the file runtime entrypoint.
 * - Print structured results or usage errors to the console.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Run the `ax build` command with local-file discovery when no explicit target is provided.
 *
 * @param {string[]} args
 * @param {object} dependencies
 * @param {Function} dependencies.runIntentFile
 * @param {object} dependencies.logger
 * @param {Function} [dependencies.resolveBuildTarget]
 * @param {object} [dependencies.signalHandlers]
 * @returns {Promise<number>}
 */
export async function buildCommand(
  args,
  {
    runIntentFile,
    logger,
    resolveBuildTarget = resolveBuildTargetDefault,
    signalHandlers = defaultSignalHandlers
  }
) {
  const verbose = args.includes('--verbose');
  let filePath = args.find((arg) => arg !== '--verbose');

  if (!filePath) {
    try {
      filePath = await resolveBuildTarget(process.cwd());
    } catch (error) {
      logger.error(error.message);
      return 1;
    }
  }

  return executeBuild(filePath, { verbose, runIntentFile, logger, signalHandlers });
}

async function executeBuild(filePath, { verbose, runIntentFile, logger, signalHandlers }) {
  const controller = new AbortController();
  const handleInterrupt = () => {
    controller.abort();
  };
  signalHandlers.register(handleInterrupt);

  try {
    const result = await runIntentFile(filePath, {
      signal: controller.signal,
      onEvent(event) {
        if (event.type === 'step.started') {
          logger.log(`[step] ${event.stepId} started`);
        }

        if (event.type === 'step.output') {
          if (verbose || event.visibility !== 'noise') {
            logger.log(`[output:${event.stepId}] ${event.chunk}`);
          }
        }

        if (event.type === 'step.finished') {
          logger.log(`[step] ${event.stepId} ${event.status}`);
        }
      }
    });
    for (const diagnostic of result.diagnostics ?? []) {
      logger.error(
        `[error:${diagnostic.kind ?? 'runtime'}] ${diagnostic.message} Next: ${diagnostic.nextAction}`
      );
    }
    if (result.healthReport) {
      logger.log(
        `[summary] ${result.healthReport.status} source=${result.healthReport.sourceVersion ?? 'unknown'} built=${result.healthReport.builtVersion ?? 'unknown'} steps=${result.healthReport.steps.passed}/${result.healthReport.steps.total} verification=${result.healthReport.verification.passed}/${result.healthReport.verification.total} files=${result.healthReport.generatedFiles}`
      );
    }
    logger.log(JSON.stringify(result, null, 2));
    if (result.status === 'interrupted') {
      return 130;
    }

    return result.status === 'passed' ? 0 : 1;
  } catch (error) {
    if (error.code === 'INTERRUPTED') {
      return 130;
    }

    logger.error(error.message);
    return 1;
  } finally {
    signalHandlers.unregister(handleInterrupt);
  }
}

const defaultSignalHandlers = {
  register(handler) {
    process.once('SIGINT', handler);
  },
  unregister(handler) {
    process.off('SIGINT', handler);
  }
};

async function resolveBuildTargetDefault(cwd) {
  const entries = await fs.readdir(cwd, { withFileTypes: true });
  const candidates = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.axiom.js'))
    .map((entry) => entry.name)
    .sort();

  if (candidates.length === 0) {
    throw new Error(
      `No .axiom.js file found in ${cwd}. Run \`ax build <file.axiom.js>\` or add a local intent file.`
    );
  }

  if (candidates.length > 1) {
    throw new Error(
      `Multiple .axiom.js files found in ${cwd}: ${candidates.join(', ')}. Run \`ax build <file.axiom.js>\`.`
    );
  }

  return path.join(cwd, candidates[0]);
}
