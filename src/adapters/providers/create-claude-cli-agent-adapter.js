/**
 * Purpose: Execute live agent requests through the local Claude CLI.
 * Responsibilities:
 * - Translate named runtime capabilities into `claude --print` calls.
 * - Keep live provider execution local to the user's existing CLI session.
 * - Normalize CLI output into plain runtime step results.
 */
import { runCliCommand } from './run-cli-command.js';
import { parseJsonOutput } from './parse-json-output.js';

/**
 * Create a Claude CLI-backed adapter for a named capability.
 *
 * @param {string} agentName
 * @param {object} [config={}]
 * @returns {object}
 */
export function createClaudeCliAgentAdapter(agentName, config = {}) {
  return {
    async run(input, options = {}) {
      const result = await (config.runner ?? runCliCommand)({
        command: config.command ?? 'claude',
        args: buildArgs(serializeInput(input), config),
        cwd: config.cwd ?? process.cwd(),
        input: '',
        signal: options.signal,
        onStdout(chunk) {
          options.onOutput?.({
            chunk,
            visibility: classifyClaudeChunk(chunk)
          });
        },
        onStderr(chunk) {
          options.onOutput?.({
            chunk,
            visibility: chunk.startsWith('warning:') ? 'warning' : 'progress'
          });
        }
      });

      if (result.exitCode !== 0) {
        throw new Error(`claude CLI request failed for ${agentName}: ${result.stderr || result.exitCode}`);
      }

      return normalizeOutput(result.stdout, agentName, config);
    }
  };
}

/**
 * Classify live Claude CLI output for default vs verbose rendering.
 *
 * @param {string} chunk
 * @returns {string}
 */
function classifyClaudeChunk(chunk) {
  if (!chunk || !chunk.trim()) {
    return 'noise';
  }

  if (chunk.startsWith('warning:')) {
    return 'warning';
  }

  if (chunk.trim().startsWith('{') || chunk.trim().startsWith('[')) {
    return 'result';
  }

  return 'progress';
}

/**
 * Build the non-interactive Claude CLI argument list.
 *
 * @param {string} prompt
 * @param {object} config
 * @returns {string[]}
 */
function buildArgs(prompt, config) {
  const args = ['--print', '--output-format', 'text'];

  if (config.model) {
    args.push('--model', config.model);
  }

  args.push(prompt);
  return args;
}

/**
 * Convert runtime input into prompt text for the Claude CLI.
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
