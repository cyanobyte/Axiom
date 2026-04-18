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
        image: 'axiom-build-node-webapp:local',
        dockerfile: 'docker/runner/node-webapp/Dockerfile',
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
        image: 'axiom-build-node-webapp:local',
        dockerfile: 'docker/runner/node-webapp/Dockerfile',
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

  it('resolves live Codex credential mounts without leaking the host HOME env', () => {
    const plan = createBuildRunnerPlan({
      intentPath: '/repo/examples/docker-codex-counter/counter-webapp.axiom.js',
      runtimeConfigPath: '/repo/examples/docker-codex-counter/axiom.config.js',
      runtimeConfig: {
        workspace: { root: './examples/docker-codex-counter/generated' },
        artifacts: { root: './reports' }
      },
      buildSecurity: {
        mode: 'docker',
        profile: 'node-webapp-codex-live',
        image: 'axiom-build-node-webapp:local',
        dockerfile: 'docker/runner/node-webapp/Dockerfile',
        network: 'bridge',
        env: { allow: ['PATH', 'NODE_ENV'] },
        resources: { cpu: 2, memory: '4g' },
        tools: ['node', 'npm', 'codex'],
        credentialMounts: [
          {
            source: '~/.codex/auth.json',
            target: '/home/node/.codex/auth.json',
            readonly: true
          },
          {
            source: '~/.codex/config.toml',
            target: '/home/node/.codex/config.toml',
            readonly: true
          }
        ]
      },
      environment: {
        PATH: '/usr/bin',
        HOME: '/home/user',
        NODE_ENV: 'development'
      },
      projectRoot: '/repo'
    });

    expect(plan.env).toEqual({
      AXIOM_RUNNER: '1',
      AXIOM_RUNNER_KIND: 'docker',
      AXIOM_WORKSPACE_ROOT: '/workspace/generated',
      AXIOM_ARTIFACTS_ROOT: '/workspace/reports',
      PATH: '/usr/bin',
      NODE_ENV: 'development'
    });
    expect(plan.credentialMounts).toEqual([
      {
        source: '/home/user/.codex/auth.json',
        target: '/home/node/.codex/auth.json',
        readonly: true
      },
      {
        source: '/home/user/.codex/config.toml',
        target: '/home/node/.codex/config.toml',
        readonly: true
      }
    ]);
  });

  it('resolves live Codex credential mounts to the invoking user when run through sudo', () => {
    const plan = createBuildRunnerPlan({
      intentPath: '/repo/examples/docker-codex-counter/counter-webapp.axiom.js',
      runtimeConfigPath: '/repo/examples/docker-codex-counter/axiom.config.js',
      runtimeConfig: {
        workspace: { root: './examples/docker-codex-counter/generated' },
        artifacts: { root: './reports' }
      },
      buildSecurity: {
        mode: 'docker',
        profile: 'node-webapp-codex-live',
        image: 'axiom-build-node-webapp:local',
        dockerfile: 'docker/runner/node-webapp/Dockerfile',
        network: 'bridge',
        env: { allow: ['PATH'] },
        resources: { cpu: 2, memory: '4g' },
        tools: ['node', 'npm', 'codex'],
        credentialMounts: [
          {
            source: '~/.codex/auth.json',
            target: '/home/node/.codex/auth.json',
            readonly: true
          }
        ]
      },
      environment: {
        PATH: '/usr/bin',
        HOME: '/root',
        SUDO_USER: 'welsh'
      },
      projectRoot: '/repo'
    });

    expect(plan.credentialMounts).toEqual([
      {
        source: '/home/welsh/.codex/auth.json',
        target: '/home/node/.codex/auth.json',
        readonly: true
      }
    ]);
  });
});
