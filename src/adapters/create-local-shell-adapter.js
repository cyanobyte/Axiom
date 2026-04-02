/**
 * Purpose: Provide a local shell worker surface for runtime commands.
 * Responsibilities:
 * - Act as the runtime boundary for command execution.
 * - Normalize local process results into a simple worker response.
 * - Preserve stdout, stderr, and exit codes for runtime diagnostics.
 */
import { spawn } from 'node:child_process';

/**
 * Create a shell adapter for local command execution.
 *
 * @returns {object}
 */
export function createLocalShellAdapter() {
  return {
    async exec(spec, options = {}) {
      return new Promise((resolve, reject) => {
        const child = spawn(spec.command, {
          cwd: spec.cwd,
          shell: true
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (chunk) => {
          stdout += String(chunk);
          options.onOutput?.(String(chunk).trimEnd());
        });

        child.stderr.on('data', (chunk) => {
          stderr += String(chunk);
          options.onOutput?.(String(chunk).trimEnd());
        });

        child.on('error', reject);
        child.on('close', (exitCode) => {
          resolve({
            ...spec,
            stdout,
            stderr,
            exitCode: exitCode ?? 1
          });
        });
      });
    }
  };
}
