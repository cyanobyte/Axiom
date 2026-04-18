import { describe, expect, it, vi } from 'vitest';
import { buildCommand } from '../../src/cli/build-command.js';

function createLogger() {
  return {
    log: vi.fn(),
    error: vi.fn()
  };
}

function createDependencies({ dockerRunnerResult = { exitCode: 0 }, ensurerResult = { built: true }, ensurerError } = {}) {
  const runnerRun = vi.fn(async () => dockerRunnerResult);
  const ensure = vi.fn(async () => {
    if (ensurerError) throw ensurerError;
    return ensurerResult;
  });

  return {
    runnerRun,
    ensure,
    logger: createLogger(),
    deps: {
      runIntentFile: vi.fn(),
      loadIntentFile: vi.fn(async () => ({
        definition: {
          security: {
            build: { mode: 'docker', profile: 'node-webapp' }
          }
        }
      })),
      loadRuntimeConfig: vi.fn(async () => ({
        workspace: { root: './generated' },
        artifacts: { root: './reports' }
      })),
      validateRuntimeConfig: (config) => config,
      createBuildRunnerPlan: () => ({
        kind: 'docker-build-runner-plan',
        intentPath: 'app.axiom.js',
        projectRoot: '/repo',
        runtimeConfigPath: '/repo/axiom.config.js',
        workspaceRoot: '/repo/generated',
        artifactsRoot: '/repo/reports',
        buildSecurity: {
          mode: 'docker',
          profile: 'node-webapp',
          image: 'axiom-build-node-webapp:local',
          dockerfile: 'docker/runner/node-webapp/Dockerfile',
          network: 'restricted',
          resources: { cpu: 2, memory: '4g' }
        },
        env: {}
      }),
      createDockerBuildRunner: () => ({ run: runnerRun }),
      createDockerImageEnsurer: () => ({ ensure }),
      getAxiomPackageRoot: () => '/axiom',
      environment: {},
      projectRoot: '/repo',
      signalHandlers: { register: () => {}, unregister: () => {} }
    }
  };
}

describe('ax build docker-mode auto-build wiring', () => {
  it('calls ensurer with resolved dockerfile and axiom package root before launching the runner', async () => {
    const { ensure, runnerRun, logger, deps } = createDependencies();

    const exitCode = await buildCommand(['app.axiom.js'], { ...deps, logger });

    expect(ensure).toHaveBeenCalledWith(
      {
        image: 'axiom-build-node-webapp:local',
        dockerfile: '/axiom/docker/runner/node-webapp/Dockerfile',
        buildContext: '/axiom'
      },
      expect.objectContaining({ onOutput: expect.any(Function) })
    );

    const ensureCallOrder = ensure.mock.invocationCallOrder[0];
    const runnerCallOrder = runnerRun.mock.invocationCallOrder[0];
    expect(ensureCallOrder).toBeLessThan(runnerCallOrder);
    expect(exitCode).toBe(0);
  });

  it('does not launch the runner when the ensurer fails', async () => {
    const error = new Error('Docker runner image build failed with exit code 1');
    error.code = 'DOCKER_BUILD_RUNNER_IMAGE_BUILD_FAILED';
    const { ensure, runnerRun, logger, deps } = createDependencies({ ensurerError: error });

    const exitCode = await buildCommand(['app.axiom.js'], { ...deps, logger });

    expect(ensure).toHaveBeenCalledTimes(1);
    expect(runnerRun).not.toHaveBeenCalled();
    expect(exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Docker runner image build failed'));
  });

  it('announces the image build before streaming Docker output', async () => {
    const { ensure, logger, deps } = createDependencies();

    await buildCommand(['app.axiom.js'], { ...deps, logger });

    expect(ensure).toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      'Building Axiom runner image axiom-build-node-webapp:local ...'
    );
  });
});
