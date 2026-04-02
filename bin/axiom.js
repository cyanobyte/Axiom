#!/usr/bin/env node

import { runCommand } from '../src/cli/run-command.js';
import { runIntentFile } from '../src/public/run-intent-file.js';

const args = process.argv.slice(2);

if (args[0] === 'run') {
  const exitCode = await runCommand(args.slice(1), { runIntentFile, logger: console });
  process.exit(exitCode);
}

console.error('Usage: axiom run <file.axiom.js>');
process.exit(1);
