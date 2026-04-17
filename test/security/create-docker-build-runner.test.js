import { describe, expect, it, vi } from 'vitest';
import { createDockerBuildRunner } from '../../src/security/create-docker-build-runner.js';

const plan = {
  kind: 'docker-build-runner-plan',
  intentPath: 'examples/basic/counter-webapp.axiom.js',
  projectRoot: '/repo',
  workspaceRoot: '/repo/examples/basic/generated',
  artifactsRoot: '/repo/examples/basic/reports',
  buildSecurity: {
    mode: 'docker',
    image: 'ghcr.io/science451/axiom-build-node-webapp:latest',
    network: 'restricted',
    resources: { cpu: 2, memory: '4g' }
  },
  env: {
    AXIOM_RUNNER: '1',
    AXIOM_RUNNER_KIND: 'docker',
    AXIOM_WORKSPACE_ROOT: '/workspace/generated',
    AXIOM_ARTIFACTS_ROOT: '/workspace/reports',
    NODE_ENV: 'development'
  }
};

describe('createDockerBuildRunner', () => {
  it('runs docker with source, workspace, artifact mounts and runner env', async () => {
    const processRunner = vi.fn(async () => ({ exitCode: 7 }));
    const runner = createDockerBuildRunner({ processRunner });

    const result = await runner.run(plan, { signal: 'signal-value' });

    expect(result).toEqual({ exitCode: 7 });
    expect(processRunner).toHaveBeenCalledWith(
      'docker',
      [
        'run',
        '--rm',
        '--network',
        'none',
        '--cpus',
        '2',
        '--memory',
        '4g',
        '-e',
        'AXIOM_RUNNER=1',
        '-e',
        'AXIOM_RUNNER_KIND=docker',
        '-e',
        'AXIOM_WORKSPACE_ROOT=/workspace/generated',
        '-e',
        'AXIOM_ARTIFACTS_ROOT=/workspace/reports',
        '-e',
        'NODE_ENV=development',
        '-v',
        '/repo:/workspace/source:ro',
        '-v',
        '/repo/examples/basic/generated:/workspace/generated',
        '-v',
        '/repo/examples/basic/reports:/workspace/reports',
        '-w',
        '/workspace/source',
        'ghcr.io/science451/axiom-build-node-webapp:latest',
        'ax',
        'build',
        'examples/basic/counter-webapp.axiom.js',
        '--inside-runner'
      ],
      { cwd: '/repo', signal: 'signal-value', onOutput: undefined }
    );
  });

  it('wraps process start errors with a Docker runner code', async () => {
    const processRunner = vi.fn(async () => {
      throw new Error('spawn docker ENOENT');
    });
    const runner = createDockerBuildRunner({ processRunner });

    await expect(runner.run(plan)).rejects.toMatchObject({
      code: 'DOCKER_BUILD_RUNNER_START_FAILED',
      message: 'Docker build runner could not start: spawn docker ENOENT'
    });
  });
});
