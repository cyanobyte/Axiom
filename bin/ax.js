#!/usr/bin/env node

import { analyzeCommand } from '../src/cli/analyze-command.js';
import { buildCommand } from '../src/cli/build-command.js';
import { fixCommand } from '../src/cli/fix-command.js';
import { initCommand } from '../src/cli/init-command.js';
import { validateRuntimeConfig } from '../src/config/validate-runtime-config.js';
import { checkReadiness } from '../src/runtime/check-readiness.js';
import { loadIntentFile } from '../src/public/load-intent-file.js';
import { loadRuntimeConfig } from '../src/public/load-runtime-config.js';
import { runIntentFile } from '../src/public/run-intent-file.js';
import { createBuildRunnerPlan } from '../src/security/create-build-runner-plan.js';
import { createDockerBuildRunner } from '../src/security/create-docker-build-runner.js';

const args = process.argv.slice(2);

if (args[0] === 'init') {
  const exitCode = await initCommand(args.slice(1), {
    logger: console
  });
  process.exit(exitCode);
}

if (args[0] === 'analyze') {
  const exitCode = await analyzeCommand(args.slice(1), {
    loadIntentFile,
    loadRuntimeConfig,
    validateRuntimeConfig,
    checkReadiness,
    logger: console
  });
  process.exit(exitCode);
}

if (args[0] === 'build') {
  const exitCode = await buildCommand(args.slice(1), {
    runIntentFile,
    logger: console,
    loadIntentFile,
    loadRuntimeConfig,
    validateRuntimeConfig,
    createBuildRunnerPlan,
    createDockerBuildRunner
  });
  process.exit(exitCode);
}

if (args[0] === 'fix') {
  const exitCode = await fixCommand(args.slice(1), { loadIntentFile, logger: console });
  process.exit(exitCode);
}

console.error('Usage: ax <init|analyze|build|fix> ...');
process.exit(1);
