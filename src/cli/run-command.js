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
 * @returns {Promise<number>}
 */
export async function runCommand(args, { runIntentFile, logger }) {
  const filePath = args[0];
  if (!filePath) {
    logger.error('Usage: axiom run <file.axiom.js>');
    return 1;
  }

  try {
    const result = await runIntentFile(filePath, {
      onEvent(event) {
        if (event.type === 'step.started') {
          logger.log(`[step] ${event.stepId} started`);
        }

        if (event.type === 'step.output') {
          logger.log(`[output:${event.stepId}] ${event.chunk}`);
        }

        if (event.type === 'step.finished') {
          logger.log(`[step] ${event.stepId} ${event.status}`);
        }
      }
    });
    logger.log(JSON.stringify(result, null, 2));
    return result.status === 'passed' ? 0 : 1;
  } catch (error) {
    logger.error(error.message);
    return 1;
  }
}
