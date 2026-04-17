import { describe, expect, it, vi } from 'vitest';
import { buildCommand } from '../../src/cli/build-command.js';

describe('buildCommand', () => {
  it('runs an explicit intent file path provided on the command line', async () => {
    const runIntentFile = vi.fn(async (_filePath, options) => {
      options.onEvent({ type: 'step.started', stepId: 'plan' });
      options.onEvent({ type: 'step.output', stepId: 'plan', chunk: 'working' });
      options.onEvent({ type: 'step.finished', stepId: 'plan', status: 'passed' });
      return {
        status: 'passed',
        events: [],
        healthReport: {
          sourceVersion: '1.0.0',
          builtVersion: '1.0.0',
          status: 'passed',
          steps: { passed: 1, total: 1 },
          verification: { passed: 0, total: 0 },
          generatedFiles: 0
        }
      };
    });
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await buildCommand(
      ['examples/basic/counter-webapp.axiom.js'],
      { runIntentFile, logger, ...localBuildInspection() }
    );

    expect(exitCode).toBe(0);
    expect(runIntentFile).toHaveBeenCalledWith(
      'examples/basic/counter-webapp.axiom.js',
      expect.objectContaining({
        onEvent: expect.any(Function)
      })
    );
    expect(logger.log).toHaveBeenCalledWith('[step] plan started');
    expect(logger.log).toHaveBeenCalledWith('[output:plan] working');
    expect(logger.log).toHaveBeenCalledWith('[step] plan passed');
    expect(logger.log).toHaveBeenCalledWith(
      '[summary] passed source=1.0.0 built=1.0.0 steps=1/1 verification=0/0 files=0'
    );
  });

  it('resolves the local canonical axiom file when no file is provided', async () => {
    const runIntentFile = vi.fn(async () => ({ status: 'passed', events: [] }));
    const logger = { log: vi.fn(), error: vi.fn() };
    const resolveBuildTarget = vi.fn(async () => 'counter-webapp.axiom.js');

    const exitCode = await buildCommand([], {
      runIntentFile,
      resolveBuildTarget,
      logger,
      ...localBuildInspection()
    });

    expect(exitCode).toBe(0);
    expect(resolveBuildTarget).toHaveBeenCalled();
    expect(runIntentFile).toHaveBeenCalledWith(
      'counter-webapp.axiom.js',
      expect.objectContaining({
        onEvent: expect.any(Function)
      })
    );
  });

  it('prints ax-prefixed usage when no file path is available', async () => {
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await buildCommand([], {
      runIntentFile: vi.fn(),
      resolveBuildTarget: vi.fn(async () => {
        throw new Error('No .axiom.js file found in /repo');
      }),
      logger
    });

    expect(exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith('No .axiom.js file found in /repo');
  });

  it('filters provider transcript noise in default mode', async () => {
    const runIntentFile = vi.fn(async (_filePath, options) => {
      options.onEvent({ type: 'step.started', stepId: 'plan' });
      options.onEvent({
        type: 'step.output',
        stepId: 'plan',
        source: 'agent:planner',
        chunk: 'OpenAI Codex v0.118.0 (research preview)',
        visibility: 'noise'
      });
      options.onEvent({
        type: 'step.output',
        stepId: 'plan',
        source: 'agent:planner',
        chunk: 'Using `using-superpowers` first',
        visibility: 'noise'
      });
      options.onEvent({
        type: 'step.output',
        stepId: 'plan',
        source: 'agent:planner',
        chunk: 'Planning counter app structure...',
        visibility: 'progress'
      });
      options.onEvent({
        type: 'step.output',
        stepId: 'plan',
        source: 'agent:planner',
        chunk: '{"includesLoadCounter":true}',
        visibility: 'result'
      });
      options.onEvent({ type: 'step.finished', stepId: 'plan', status: 'passed' });
      return { status: 'passed', events: [] };
    });
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await buildCommand(
      ['examples/basic/counter-webapp.axiom.js'],
      { runIntentFile, logger, ...localBuildInspection() }
    );

    expect(exitCode).toBe(0);
    expect(logger.log).not.toHaveBeenCalledWith('[output:plan] OpenAI Codex v0.118.0 (research preview)');
    expect(logger.log).not.toHaveBeenCalledWith('[output:plan] Using `using-superpowers` first');
    expect(logger.log).toHaveBeenCalledWith('[output:plan] Planning counter app structure...');
    expect(logger.log).toHaveBeenCalledWith('[output:plan] {"includesLoadCounter":true}');
  });

  it('prints raw provider transcript in verbose mode', async () => {
    const runIntentFile = vi.fn(async (_filePath, options) => {
      options.onEvent({
        type: 'step.output',
        stepId: 'implement',
        source: 'agent:coder',
        chunk: 'OpenAI Codex v0.118.0 (research preview)',
        visibility: 'noise'
      });
      return { status: 'passed', events: [] };
    });
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await buildCommand(
      ['--verbose', 'examples/live-counter/counter-webapp.axiom.js'],
      { runIntentFile, logger, ...localBuildInspection() }
    );

    expect(exitCode).toBe(0);
    expect(logger.log).toHaveBeenCalledWith('[output:implement] OpenAI Codex v0.118.0 (research preview)');
  });

  it('returns 130 when the build is interrupted by SIGINT', async () => {
    let interruptHandler;
    const runIntentFile = vi.fn(async (_filePath, options) => {
      interruptHandler();
      expect(options.signal.aborted).toBe(true);
      return { status: 'interrupted', events: [], diagnostics: [{ message: 'Build interrupted by user.' }] };
    });
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await buildCommand(
      ['examples/live-counter/counter-webapp.axiom.js'],
      {
        runIntentFile,
        logger,
        signalHandlers: {
          register(handler) {
            interruptHandler = handler;
          },
          unregister() {}
        },
        ...localBuildInspection()
      }
    );

    expect(exitCode).toBe(130);
  });

  it('prints concise compiler-style diagnostics for failed builds', async () => {
    const runIntentFile = vi.fn(async () => ({
      status: 'failed',
      diagnostics: [
        {
          kind: 'verification',
          stepId: 'verify',
          message: 'Outcome verification failed: counter-ui-flow.',
          nextAction: 'Update the intent, generated files, or verification evidence so the declared outcome passes.'
        }
      ],
      events: []
    }));
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await buildCommand(
      ['examples/live-counter/counter-webapp.axiom.js'],
      { runIntentFile, logger, ...localBuildInspection() }
    );

    expect(exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      '[error:verification] Outcome verification failed: counter-ui-flow. Next: Update the intent, generated files, or verification evidence so the declared outcome passes.'
    );
  });

  it('prints a clear error when multiple local axiom files exist', async () => {
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await buildCommand([], {
      runIntentFile: vi.fn(),
      resolveBuildTarget: vi.fn(async () => {
        throw new Error(
          'Multiple .axiom.js files found in /repo: app.axiom.js, api.axiom.js. Run `ax build <file.axiom.js>`.'
        );
      }),
      logger
    });

    expect(exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Multiple .axiom.js files found in /repo: app.axiom.js, api.axiom.js. Run `ax build <file.axiom.js>`.'
    );
  });

  it('launches Docker runner on the host and skips local runtime execution', async () => {
    const loadIntentFile = vi.fn(async () => ({
      definition: {
        security: {
          build: {
            mode: 'docker',
            profile: 'node-webapp',
            image: 'image',
            network: 'restricted',
            env: { allow: [] },
            resources: { cpu: 2, memory: '4g' },
            tools: ['node', 'npm']
          }
        }
      }
    }));
    const loadRuntimeConfig = vi.fn(async () => ({
      workspace: { root: './generated' },
      artifacts: { root: './reports' }
    }));
    const validateRuntimeConfig = vi.fn((config) => config);
    const createBuildRunnerPlan = vi.fn(() => ({ kind: 'docker-build-runner-plan' }));
    const dockerBuildRunner = { run: vi.fn(async () => ({ exitCode: 23 })) };
    const createDockerBuildRunner = vi.fn(() => dockerBuildRunner);
    const runIntentFile = vi.fn();
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await buildCommand(['app.axiom.js'], {
      runIntentFile,
      logger,
      loadIntentFile,
      loadRuntimeConfig,
      validateRuntimeConfig,
      createBuildRunnerPlan,
      createDockerBuildRunner,
      environment: {}
    });

    expect(exitCode).toBe(23);
    expect(runIntentFile).not.toHaveBeenCalled();
    expect(createBuildRunnerPlan).toHaveBeenCalledWith(expect.objectContaining({
      intentPath: 'app.axiom.js',
      runtimeConfig: {
        workspace: { root: './generated' },
        artifacts: { root: './reports' }
      }
    }));
    expect(dockerBuildRunner.run).toHaveBeenCalledWith(
      { kind: 'docker-build-runner-plan' },
      expect.objectContaining({ signal: expect.any(AbortSignal), onOutput: expect.any(Function) })
    );
  });

  it('runs local runtime inside a valid runner environment', async () => {
    const runIntentFile = vi.fn(async () => ({ status: 'passed', events: [] }));
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await buildCommand(['app.axiom.js', '--inside-runner'], {
      runIntentFile,
      logger,
      environment: { AXIOM_RUNNER: '1' }
    });

    expect(exitCode).toBe(0);
    expect(runIntentFile).toHaveBeenCalledWith(
      'app.axiom.js',
      expect.objectContaining({
        environment: { AXIOM_RUNNER: '1' }
      })
    );
  });

  it('rejects inside-runner flag without runner environment marker', async () => {
    const runIntentFile = vi.fn();
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await buildCommand(['app.axiom.js', '--inside-runner'], {
      runIntentFile,
      logger,
      environment: {}
    });

    expect(exitCode).toBe(1);
    expect(runIntentFile).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('--inside-runner requires AXIOM_RUNNER=1.');
  });

  it('does not launch a nested runner when AXIOM_RUNNER is already set', async () => {
    const runIntentFile = vi.fn(async () => ({ status: 'passed', events: [] }));
    const createDockerBuildRunner = vi.fn();
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await buildCommand(['app.axiom.js'], {
      runIntentFile,
      logger,
      createDockerBuildRunner,
      environment: { AXIOM_RUNNER: '1' }
    });

    expect(exitCode).toBe(0);
    expect(createDockerBuildRunner).not.toHaveBeenCalled();
    expect(runIntentFile).toHaveBeenCalled();
  });

  it('fails VM build mode before executing authored workflow', async () => {
    const loadIntentFile = vi.fn(async () => ({
      definition: {
        security: {
          build: {
            mode: 'vm',
            provider: 'virtualbox',
            profile: 'node-webapp'
          }
        }
      }
    }));
    const loadRuntimeConfig = vi.fn(async () => ({
      workspace: { root: './generated' },
      artifacts: { root: './reports' }
    }));
    const validateRuntimeConfig = vi.fn((config) => config);
    const runIntentFile = vi.fn();
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await buildCommand(['app.axiom.js'], {
      runIntentFile,
      logger,
      loadIntentFile,
      loadRuntimeConfig,
      validateRuntimeConfig,
      environment: {}
    });

    expect(exitCode).toBe(1);
    expect(runIntentFile).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      '[error:UNSUPPORTED_BUILD_RUNNER] security.build.mode "vm" is validated but VM build runners are not implemented yet.'
    );
  });
});

function localBuildInspection() {
  return {
    loadIntentFile: vi.fn(async () => ({ definition: {} })),
    loadRuntimeConfig: vi.fn(async () => ({
      workspace: { root: './generated' },
      artifacts: { root: './reports' }
    })),
    validateRuntimeConfig: vi.fn((config) => config)
  };
}
