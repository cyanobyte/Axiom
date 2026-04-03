/**
 * Purpose: Provide the user-facing CLI command handler for running intent files.
 * Responsibilities:
 * - Parse the target file path from command arguments.
 * - Execute the file runtime entrypoint.
 * - Print structured results or usage errors to the console.
 */

/**
 * Run the `axiom run` command with injected runtime and logger dependencies.
 *
 * @param {string[]} args
 * @param {object} dependencies
 * @param {Function} dependencies.runIntentFile
 * @param {object} dependencies.logger
 * @param {object} [dependencies.signalHandlers]
 * @returns {Promise<number>}
 */
export async function runCommand(args, { runIntentFile, logger, signalHandlers = {
    register(handler) {
      process.once('SIGINT', handler);
    },
    unregister(handler) {
      process.off('SIGINT', handler);
    }
  } }) {
  const verbose = args.includes('--verbose');
  const filePath = args.find((arg) => arg !== '--verbose');
  if (!filePath) {
    logger.error('Usage: axiom run [--verbose] <file.axiom.js>');
    return 1;
  }

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
