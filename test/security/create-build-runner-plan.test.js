import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createBuildRunnerPlan } from '../../src/security/create-build-runner-plan.js';

describe('createBuildRunnerPlan', () => {
  it('creates a Docker runner contract with resolved mounts and allowlisted env', () => {
    const projectRoot = path.resolve('/repo');
    const plan = createBuildRunnerPlan({
      intentPath: '/repo/examples/basic/counter-webapp.axiom.js',
      runtimeConfigPath: '/repo/examples/basic/axiom.config.js',
      runtimeConfig: {
        workspace: { root: './examples/basic/generated' },
        artifacts: { root: '../reports' }
      },
      buildSecurity: {
        mode: 'docker',
        profile: 'node-webapp',
        image: 'ghcr.io/science451/axiom-build-node-webapp:latest',
        network: 'restricted',
        env: { allow: ['PATH', 'HOME', 'NODE_ENV', 'MISSING_ENV'] },
        resources: { cpu: 2, memory: '4g' },
        tools: ['node', 'npm']
      },
      environment: {
        PATH: '/usr/bin',
        HOME: '/home/user',
        NODE_ENV: 'development'
      },
      projectRoot
    });

    expect(plan).toEqual({
      kind: 'docker-build-runner-plan',
      intentPath: 'examples/basic/counter-webapp.axiom.js',
      projectRoot,
      runtimeConfigPath: '/repo/examples/basic/axiom.config.js',
      workspaceRoot: '/repo/examples/basic/generated',
      artifactsRoot: '/repo/examples/basic/reports',
      buildSecurity: {
        mode: 'docker',
        profile: 'node-webapp',
        image: 'ghcr.io/science451/axiom-build-node-webapp:latest',
        network: 'restricted',
        env: { allow: ['PATH', 'HOME', 'NODE_ENV', 'MISSING_ENV'] },
        resources: { cpu: 2, memory: '4g' },
        tools: ['node', 'npm']
      },
      env: {
        AXIOM_RUNNER: '1',
        AXIOM_RUNNER_KIND: 'docker',
        AXIOM_WORKSPACE_ROOT: '/workspace/generated',
        AXIOM_ARTIFACTS_ROOT: '/workspace/reports',
        PATH: '/usr/bin',
        HOME: '/home/user',
        NODE_ENV: 'development'
      }
    });
  });

  it('rejects non-Docker build security', () => {
    expect(() =>
      createBuildRunnerPlan({
        intentPath: '/repo/app.axiom.js',
        runtimeConfigPath: '/repo/axiom.config.js',
        runtimeConfig: {
          workspace: { root: './generated' },
          artifacts: { root: './reports' }
        },
        buildSecurity: { mode: 'local' },
        environment: {},
        projectRoot: '/repo'
      })
    ).toThrow('createBuildRunnerPlan requires docker build security.');
  });
});
