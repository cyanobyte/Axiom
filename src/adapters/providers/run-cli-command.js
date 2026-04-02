/**
 * Purpose: Execute provider CLI commands for live agent requests.
 * Responsibilities:
 * - Spawn a local CLI process with explicit arguments.
 * - Send prompt content through stdin when needed.
 * - Normalize stdout, stderr, and exit codes for provider adapters.
 */
import { spawn } from 'node:child_process';

/**
 * Run a CLI command and capture its output.
 *
 * @param {object} spec
 * @param {string} spec.command
 * @param {string[]} [spec.args=[]]
 * @param {string} [spec.cwd=process.cwd()]
 * @param {string} [spec.input='']
 * @param {Function} [spec.onStdout]
 * @param {Function} [spec.onStderr]
 * @returns {Promise<object>}
 */
export function runCliCommand(spec) {
  return new Promise((resolve, reject) => {
    const child = spawn(spec.command, spec.args ?? [], {
      cwd: spec.cwd ?? process.cwd(),
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
      spec.onStdout?.(String(chunk).trimEnd());
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
      spec.onStderr?.(String(chunk).trimEnd());
    });

    child.on('error', reject);
    child.on('close', (exitCode) => {
      resolve({
        stdout,
        stderr,
        exitCode: exitCode ?? 1
      });
    });

    child.stdin.end(spec.input ?? '');
  });
}
