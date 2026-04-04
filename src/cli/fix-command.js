/**
 * Purpose: Provide the user-facing CLI command handler for explicit source fixes.
 * Responsibilities:
 * - Parse `ax fix <file.axiom.js> --apply <fix-id>` arguments.
 * - Apply supported source rewrites deterministically.
 * - Report the exact fix that was applied.
 */
import fs from 'node:fs/promises';
import { appliesFix, applyFixToSource, findFixById } from './fix-rules.js';

/**
 * Run the `ax fix` command for an explicit supported fix id.
 *
 * @param {string[]} args
 * @param {object} dependencies
 * @param {Function} dependencies.loadIntentFile
 * @param {object} dependencies.logger
 * @returns {Promise<number>}
 */
export async function fixCommand(args, { loadIntentFile, logger }) {
  const filePath = args[0];
  const applyIndex = args.indexOf('--apply');
  const fixId = applyIndex >= 0 ? args[applyIndex + 1] : null;

  if (!filePath || applyIndex === -1 || !fixId) {
    logger.error('Usage: ax fix <file.axiom.js> --apply <fix-id>');
    return 1;
  }

  const fix = findFixById(fixId);
  if (!fix) {
    logger.error(`Unsupported fix id: ${fixId}`);
    return 1;
  }

  const intentFile = await loadIntentFile(filePath);
  if (!appliesFix(fixId, intentFile.definition)) {
    logger.error(`Fix \`${fixId}\` does not apply to this intent file.`);
    return 1;
  }

  const source = await fs.readFile(filePath, 'utf8');
  const updatedSource = applyFixToSource(fixId, source);
  await fs.writeFile(filePath, updatedSource, 'utf8');

  logger.log(JSON.stringify({
    status: 'fixed',
    targetFile: filePath,
    applied: [
      {
        id: fixId,
        message: 'Removed the redundant default npm build block.'
      }
    ]
  }, null, 2));
  return 0;
}
