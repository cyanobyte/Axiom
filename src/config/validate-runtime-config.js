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

  return config;
}
