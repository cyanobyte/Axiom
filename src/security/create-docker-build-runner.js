import { spawn } from 'node:child_process';

export function createDockerBuildRunner({ processRunner = spawnProcess } = {}) {
  return {
    async run(plan, { signal, onOutput } = {}) {
      try {
        return await processRunner('docker', createDockerArgs(plan), {
          cwd: plan.projectRoot,
          signal,
          onOutput
        });
      } catch (error) {
        const wrapped = new Error(`Docker build runner could not start: ${error.message}`);
        wrapped.code = 'DOCKER_BUILD_RUNNER_START_FAILED';
        throw wrapped;
      }
    }
  };
}

function createDockerArgs(plan) {
  return [
    'run',
    '--rm',
    '--network',
    plan.buildSecurity.network === 'restricted' ? 'none' : String(plan.buildSecurity.network),
    '--cpus',
    String(plan.buildSecurity.resources.cpu),
    '--memory',
    plan.buildSecurity.resources.memory,
    ...Object.entries(plan.env).flatMap(([name, value]) => ['-e', `${name}=${value}`]),
    ...formatCredentialMounts(plan.credentialMounts ?? []),
    '-v',
    `${plan.projectRoot}:/workspace/source:ro`,
    '-v',
    `${plan.workspaceRoot}:/workspace/generated`,
    '-v',
    `${plan.artifactsRoot}:/workspace/reports`,
    '-w',
    '/workspace/source',
    plan.buildSecurity.image,
    'ax',
    'build',
    plan.intentPath,
    '--inside-runner'
  ];
}

function formatCredentialMounts(mounts) {
  return mounts.flatMap((mount) => [
    '-v',
    `${mount.source}:${mount.target}${mount.readonly ? ':ro' : ''}`
  ]);
}

function spawnProcess(command, args, { cwd, signal, onOutput } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      signal,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    child.stdout.on('data', (chunk) => onOutput?.({ stream: 'stdout', chunk: String(chunk) }));
    child.stderr.on('data', (chunk) => onOutput?.({ stream: 'stderr', chunk: String(chunk) }));
    child.on('error', reject);
    child.on('close', (exitCode) => resolve({ exitCode }));
  });
}
