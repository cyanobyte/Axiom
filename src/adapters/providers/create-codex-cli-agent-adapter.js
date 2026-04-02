/**
 * Purpose: Execute live agent requests through the local Codex CLI.
 * Responsibilities:
 * - Translate named runtime capabilities into `codex exec` calls.
 * - Feed prompt content through stdin for stable non-interactive execution.
 * - Normalize CLI output into plain runtime step results.
 */
import { runCliCommand } from './run-cli-command.js';
import { parseJsonOutput } from './parse-json-output.js';

/**
 * Create a Codex CLI-backed adapter for a named capability.
 *
 * @param {string} agentName
 * @param {object} [config={}]
 * @returns {object}
 */
export function createCodexCliAgentAdapter(agentName, config = {}) {
  return {
    async run(input) {
      const prompt = serializeInput(input);
      const result = await (config.runner ?? runCliCommand)({
        command: config.command ?? 'codex',
        args: buildArgs(config),
        cwd: config.cwd ?? process.cwd(),
        input: prompt
      });

      if (result.exitCode !== 0) {
        throw new Error(`codex CLI request failed for ${agentName}: ${result.stderr || result.exitCode}`);
      }

      return normalizeOutput(result.stdout, agentName, config);
    }
  };
}

/**
 * Build the non-interactive Codex CLI argument list.
 *
 * @param {object} config
 * @returns {string[]}
 */
function buildArgs(config) {
  const args = ['exec', '-', '--skip-git-repo-check'];

  if (config.model) {
    args.push('--model', config.model);
  }

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
