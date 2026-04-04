/**
 * Purpose: Provide the user-facing CLI command handler for source analysis.
 * Responsibilities:
 * - Parse the target file path from command arguments.
 * - Analyze authored source, readiness, and sibling runtime config.
 * - Print a structured analysis result without mutating project files.
 */
import fs from 'node:fs/promises';

import { findApplicableFixes } from './fix-rules.js';

function createFinding({ kind, section, message, nextAction }) {
  return {
    kind,
    section,
    message,
    nextAction
  };
}

function createConfigError(error) {
  if (error.message === 'Missing runtime config: axiom.config.js') {
    return createFinding({
      kind: 'config',
      section: 'runtime-config',
      message: error.message,
      nextAction: 'Add axiom.config.js next to the target intent file.'
    });
  }

  return createFinding({
    kind: 'config',
    section: 'runtime-config',
    message: error.message,
    nextAction: 'Update axiom.config.js so the runtime wiring is complete before running analyze again.'
  });
}

function normalizeReadinessFinding(diagnostic) {
  return createFinding({
    kind: diagnostic.kind ?? 'readiness',
    section: 'runtime',
    message: diagnostic.message,
    nextAction: diagnostic.nextAction
  });
}

/**
 * Run the `ax analyze` command with injected loader and logger dependencies.
 *
 * @param {string[]} args
 * @param {object} dependencies
 * @param {Function} dependencies.loadIntentFile
 * @param {Function} dependencies.loadRuntimeConfig
 * @param {Function} dependencies.validateRuntimeConfig
 * @param {Function} dependencies.checkReadiness
 * @param {object} dependencies.logger
 * @returns {Promise<number>}
 */
export async function analyzeCommand(
  args,
  {
    loadIntentFile,
    readSourceFile = (filePath) => fs.readFile(filePath, 'utf8'),
    loadRuntimeConfig,
    validateRuntimeConfig,
    checkReadiness,
    logger
  }
) {
  const filePath = args[0];
  if (!filePath) {
    logger.error('Usage: ax analyze <file.axiom.js>');
    return 1;
  }

  const result = {
    status: 'passed',
    targetFile: filePath,
    errors: [],
    warnings: [],
    suggestions: []
  };

  let definition;
  let source;
  try {
    const file = await loadIntentFile(filePath);
    definition = file.definition;
    source = await readSourceFile(filePath);
  } catch (error) {
    result.status = 'invalid';
    result.errors.push(
      createFinding({
        kind: 'source',
        section: 'intent-file',
        message: error.message,
        nextAction: 'Fix the .axiom.js source so it can be loaded successfully before rerunning analyze.'
      })
    );
    logger.log(JSON.stringify(result, null, 2));
    return 1;
  }

  try {
    const config = await loadRuntimeConfig(filePath);
    validateRuntimeConfig(config);
  } catch (error) {
    result.errors.push(createConfigError(error));
  }

  const applicableFixes = findApplicableFixes({ definition, source });

  for (const diagnostic of checkReadiness(definition)) {
    if (
      diagnostic.message === 'Missing build.commands.test for full-stack web app execution.' &&
      applicableFixes.some((fix) => fix.id === 'web-build-test-command')
    ) {
      continue;
    }
    result.errors.push(normalizeReadinessFinding(diagnostic));
  }

  for (const fix of applicableFixes) {
    const finding = {
      id: fix.id,
      kind: fix.severity === 'error' ? 'readiness' : 'authoring',
      section: fix.section,
      message: fix.message,
      nextAction: fix.nextAction,
      fix: {
        type: fix.type,
        label: fix.label
      }
    };

    if (fix.severity === 'error') {
      result.errors.push(finding);
      continue;
    }

    if (fix.severity === 'warning') {
      result.warnings.push(finding);
      continue;
    }

    result.suggestions.push(finding);
  }

  if (result.errors.length > 0) {
    result.status = 'invalid';
  }

  logger.log(JSON.stringify(result, null, 2));
  return result.status === 'passed' ? 0 : 1;
}
