import path from 'node:path';

const RUNNER_WORKSPACE_ROOT = '/workspace/generated';
const RUNNER_ARTIFACTS_ROOT = '/workspace/reports';

export function createBuildRunnerPlan({
  intentPath,
  runtimeConfigPath,
  runtimeConfig,
  buildSecurity,
  environment = process.env,
  projectRoot = process.cwd()
}) {
  if (buildSecurity?.mode !== 'docker') {
    throw new Error('createBuildRunnerPlan requires docker build security.');
  }

  const resolvedProjectRoot = path.resolve(projectRoot);
  const resolvedIntentPath = path.resolve(intentPath);
  const resolvedRuntimeConfigPath = path.resolve(runtimeConfigPath);
  const workspaceRoot = resolveFromProjectRoot(resolvedProjectRoot, runtimeConfig.workspace.root);
  const artifactsRoot = path.isAbsolute(runtimeConfig.artifacts.root)
    ? runtimeConfig.artifacts.root
    : path.resolve(workspaceRoot, runtimeConfig.artifacts.root);

  const credentialMounts = resolveCredentialMounts(buildSecurity.credentialMounts ?? [], environment);

  return {
    kind: 'docker-build-runner-plan',
    intentPath: toPortableRelativePath(resolvedProjectRoot, resolvedIntentPath),
    projectRoot: resolvedProjectRoot,
    runtimeConfigPath: resolvedRuntimeConfigPath,
    workspaceRoot,
    artifactsRoot,
    buildSecurity,
    ...(credentialMounts.length > 0 ? { credentialMounts } : {}),
    env: {
      AXIOM_RUNNER: '1',
      AXIOM_RUNNER_KIND: 'docker',
      AXIOM_WORKSPACE_ROOT: RUNNER_WORKSPACE_ROOT,
      AXIOM_ARTIFACTS_ROOT: RUNNER_ARTIFACTS_ROOT,
      ...pickAllowedEnvironment(buildSecurity.env?.allow ?? [], environment)
    }
  };
}

function resolveCredentialMounts(mounts, environment) {
  return mounts.map((mount) => ({
    ...mount,
    source: resolveHostPath(mount.source, environment)
  }));
}

function resolveHostPath(configuredPath, environment) {
  if (configuredPath === '~') {
    return requireHome(environment);
  }

  if (configuredPath.startsWith('~/')) {
    return path.resolve(requireHome(environment), configuredPath.slice(2));
  }

  return path.resolve(configuredPath);
}

function requireHome(environment) {
  if (environment.HOME === '/root' && environment.SUDO_USER) {
    return path.join('/home', environment.SUDO_USER);
  }

  if (!environment.HOME) {
    throw new Error('HOME is required to resolve docker credential mounts.');
  }

  return environment.HOME;
}

function resolveFromProjectRoot(projectRoot, configuredPath) {
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(projectRoot, configuredPath);
}

function pickAllowedEnvironment(allowedNames, environment) {
  return Object.fromEntries(
    allowedNames
      .filter((name) => environment[name] !== undefined)
      .map((name) => [name, environment[name]])
  );
}

function toPortableRelativePath(root, target) {
  return path.relative(root, target).split(path.sep).join('/');
}
