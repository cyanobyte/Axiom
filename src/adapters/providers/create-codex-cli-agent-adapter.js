/**
 * Purpose: Execute live agent requests through the local Codex CLI.
 * Responsibilities:
 * - Translate named runtime capabilities into `codex exec` calls.
 * - Feed prompt content through stdin for stable non-interactive execution.
 * - Normalize CLI output into plain runtime step results.
 */
import { runCliCommand } from './run-cli-command.js';
import { parseJsonOutput } from './parse-json-output.js';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/**
 * Create a Codex CLI-backed adapter for a named capability.
 *
 * @param {string} agentName
 * @param {object} [config={}]
 * @returns {object}
 */
export function createCodexCliAgentAdapter(agentName, config = {}) {
  return {
    async run(input, options = {}) {
      const prompt = serializeInput(input);
      const lastMessagePath = await createLastMessagePath();

      const result = await (config.runner ?? runCliCommand)({
        command: config.command ?? 'codex',
        args: buildArgs(config, lastMessagePath),
        cwd: config.cwd ?? process.cwd(),
        input: prompt,
        onStdout: options.onOutput,
        onStderr: options.onOutput
      });

      try {
        if (result.exitCode !== 0) {
          throw new Error(`codex CLI request failed for ${agentName}: ${result.stderr || result.exitCode}`);
        }

        const output = await readLastMessage(result, lastMessagePath);
        return normalizeOutput(output, agentName, config);
      } finally {
        await fs.rm(lastMessagePath, { force: true });
      }
    }
  };
}

/**
 * Build the non-interactive Codex CLI argument list.
 *
 * @param {object} config
 * @param {string} lastMessagePath
 * @returns {string[]}
 */
function buildArgs(config, lastMessagePath) {
  const args = ['exec', '-', '--skip-git-repo-check'];

  if (config.model) {
    args.push('--model', config.model);
  }

  args.push('--output-last-message', lastMessagePath);
  return args;
}

/**
 * Convert runtime input into prompt text for the Codex CLI.
 *
 * @param {unknown} input
 * @returns {string}
 */
function serializeInput(input) {
  if (typeof input === 'string') {
    return input;
  }

  if (input && typeof input === 'object' && typeof input.prompt === 'string') {
    return input.prompt;
  }

  return JSON.stringify(input, null, 2);
}

/**
 * Normalize provider stdout into the configured runtime output shape.
 *
 * @param {string} output
 * @param {string} agentName
 * @param {object} config
 * @returns {unknown}
 */
function normalizeOutput(output, agentName, config) {
  if (config.output === 'json') {
    return parseJsonOutput(output, agentName);
  }

  return output.trim();
}

/**
 * Create a temporary path for Codex's final-message output file.
 *
 * @returns {Promise<string>}
 */
async function createLastMessagePath() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'axiom-codex-'));
  return path.join(directory, 'last-message.txt');
}

/**
 * Read the final assistant message from the runner result or temp file.
 *
 * @param {object} result
 * @param {string} lastMessagePath
 * @returns {Promise<string>}
 */
async function readLastMessage(result, lastMessagePath) {
  if (typeof result.lastMessage === 'string') {
    return result.lastMessage;
  }

  return fs.readFile(lastMessagePath, 'utf8');
}
