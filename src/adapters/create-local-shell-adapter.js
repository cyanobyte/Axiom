/**
 * Purpose: Provide a local shell worker surface for runtime commands.
 * Responsibilities:
 * - Act as the runtime boundary for command execution.
 * - Normalize command results into a simple worker response.
 * - Preserve the shell adapter seam for later real process execution.
 */

/**
 * Create a shell adapter for local command execution.
 *
 * @returns {object}
 */
export function createLocalShellAdapter() {
  return {
    async exec(spec) {
      return {
        ...spec,
        exitCode: 0
      };
    }
  };
}
