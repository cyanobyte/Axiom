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

  return {
    kind: 'docker-build-runner-plan',
    intentPath: toPortableRelativePath(resolvedProjectRoot, resolvedIntentPath),
    projectRoot: resolvedProjectRoot,
    runtimeConfigPath: resolvedRuntimeConfigPath,
    workspaceRoot,
    artifactsRoot,
    buildSecurity,
    env: {
      AXIOM_RUNNER: '1',
      AXIOM_RUNNER_KIND: 'docker',
      AXIOM_WORKSPACE_ROOT: RUNNER_WORKSPACE_ROOT,
      AXIOM_ARTIFACTS_ROOT: RUNNER_ARTIFACTS_ROOT,
      ...pickAllowedEnvironment(buildSecurity.env?.allow ?? [], environment)
    }
  };
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
