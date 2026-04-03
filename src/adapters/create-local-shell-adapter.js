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
        if (options.signal?.aborted) {
          reject(createInterruptedError());
          return;
        }

        const child = spawn(spec.command, {
          cwd: spec.cwd,
          shell: true
        });
        let settled = false;

        let stdout = '';
        let stderr = '';

        const handleAbort = () => {
          if (settled) {
            return;
          }

          settled = true;
          child.kill('SIGINT');
          reject(createInterruptedError());
        };

        options.signal?.addEventListener('abort', handleAbort, { once: true });

        child.stdout.on('data', (chunk) => {
          stdout += String(chunk);
          options.onOutput?.(String(chunk).trimEnd());
        });

        child.stderr.on('data', (chunk) => {
          stderr += String(chunk);
          options.onOutput?.(String(chunk).trimEnd());
        });

        child.on('error', (error) => {
          if (settled) {
            return;
          }

          settled = true;
          options.signal?.removeEventListener('abort', handleAbort);
          reject(error);
        });
        child.on('close', (exitCode) => {
          if (settled) {
            return;
          }

          settled = true;
          options.signal?.removeEventListener('abort', handleAbort);
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

/**
 * Create the normalized interruption error for shell execution.
 *
 * @returns {Error}
 */
function createInterruptedError() {
  const error = new Error('Command interrupted by user.');
  error.code = 'INTERRUPTED';
  return error;
}
