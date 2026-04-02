/**
 * Purpose: Validate runtime configuration before adapters are constructed.
 * Responsibilities:
 * - Require at least one named agent capability.
 * - Require local worker and artifact configuration for MVP execution.
 * - Require an explicit workspace root for local runtime execution.
 * - Fail early with clear runtime-config errors.
 */

/**
 * Validate the minimal runtime config shape required by the MVP.
 *
 * @param {object} config
 * @returns {object}
 */
export function validateRuntimeConfig(config) {
  if (!config?.agents || Object.keys(config.agents).length === 0) {
    throw new Error('Runtime config must define at least one agent');
  }

  if (!config?.workers?.shell) {
    throw new Error('Runtime config must define workers.shell');
  }

  if (!config?.artifacts?.root) {
    throw new Error('Runtime config must define artifacts.root');
  }

  if (!config?.workspace?.root) {
    throw new Error('Runtime config must define workspace.root');
  }

  return config;
}
