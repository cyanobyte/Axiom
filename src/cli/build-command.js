/**
 * Purpose: Provide the user-facing CLI command handler for building intent files.
 * Responsibilities:
 * - Resolve the local canonical target when no file path is provided.
 * - Execute the file runtime entrypoint.
 * - Print structured results or usage errors to the console.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadIntentFile as loadIntentFileDefault } from '../public/load-intent-file.js';
import { loadRuntimeConfig as loadRuntimeConfigDefault } from '../public/load-runtime-config.js';
import { validateRuntimeConfig as validateRuntimeConfigDefault } from '../config/validate-runtime-config.js';
import { createBuildRunnerPlan as createBuildRunnerPlanDefault } from '../security/create-build-runner-plan.js';
import { createDockerBuildRunner as createDockerBuildRunnerDefault } from '../security/create-docker-build-runner.js';
import { createDockerImageEnsurer as createDockerImageEnsurerDefault } from '../security/ensure-docker-build-image.js';
import { getAxiomPackageRoot as getAxiomPackageRootDefault } from '../runtime/axiom-package-root.js';

/**
 * Run the `ax build` command with local-file discovery when no explicit target is provided.
 *
 * @param {string[]} args
 * @param {object} dependencies
 * @param {Function} dependencies.runIntentFile
 * @param {object} dependencies.logger
 * @param {Function} [dependencies.resolveBuildTarget]
 * @param {object} [dependencies.signalHandlers]
 * @param {Function} [dependencies.loadIntentFile]
 * @param {Function} [dependencies.loadRuntimeConfig]
 * @param {Function} [dependencies.validateRuntimeConfig]
 * @param {Function} [dependencies.createBuildRunnerPlan]
 * @param {Function} [dependencies.createDockerBuildRunner]
 * @param {object} [dependencies.environment]
 * @param {string} [dependencies.projectRoot]
 * @returns {Promise<number>}
 */
export async function buildCommand(
  args,
  {
    runIntentFile,
    logger,
    resolveBuildTarget = resolveBuildTargetDefault,
    signalHandlers = defaultSignalHandlers,
    loadIntentFile = loadIntentFileDefault,
    loadRuntimeConfig = loadRuntimeConfigDefault,
    validateRuntimeConfig = validateRuntimeConfigDefault,
    createBuildRunnerPlan = createBuildRunnerPlanDefault,
    createDockerBuildRunner = createDockerBuildRunnerDefault,
    createDockerImageEnsurer = createDockerImageEnsurerDefault,
    getAxiomPackageRoot = getAxiomPackageRootDefault,
    environment = process.env,
    projectRoot = process.cwd()
  }
) {
  const verbose = args.includes('--verbose');
  const insideRunner = args.includes('--inside-runner');
  let filePath = args.find((arg) => !['--verbose', '--inside-runner'].includes(arg));

  if (!filePath) {
    try {
      filePath = await resolveBuildTarget(projectRoot);
    } catch (error) {
      logger.error(error.message);
      return 1;
    }
  }

  if (insideRunner && environment.AXIOM_RUNNER !== '1') {
    logger.error('--inside-runner requires AXIOM_RUNNER=1.');
    return 1;
  }

  if (!insideRunner && environment.AXIOM_RUNNER !== '1') {
    const runnerExitCode = await maybeExecuteBuildRunner(filePath, {
      logger,
      loadIntentFile,
      loadRuntimeConfig,
      validateRuntimeConfig,
      createBuildRunnerPlan,
      createDockerBuildRunner,
      createDockerImageEnsurer,
      getAxiomPackageRoot,
      environment,
      projectRoot,
      signalHandlers
    });

    if (runnerExitCode !== undefined) {
      return runnerExitCode;
    }
  }

  return executeBuild(filePath, { verbose, runIntentFile, logger, signalHandlers, environment });
}

async function executeBuild(filePath, { verbose, runIntentFile, logger, signalHandlers, environment }) {
  const controller = new AbortController();
  const handleInterrupt = () => {
    controller.abort();
  };
  signalHandlers.register(handleInterrupt);

  try {
    const result = await runIntentFile(filePath, {
      signal: controller.signal,
      environment,
      onEvent(event) {
        if (event.type === 'step.started') {
          logger.log(`[step] ${event.stepId} started`);
        }

        if (event.type === 'step.output') {
          if (verbose || event.visibility !== 'noise') {
            logger.log(`[output:${event.stepId}] ${event.chunk}`);
          }
        }

        if (event.type === 'step.finished') {
          logger.log(`[step] ${event.stepId} ${event.status}`);
        }
      }
    });
    for (const diagnostic of result.diagnostics ?? []) {
      logger.error(
        `[error:${diagnostic.kind ?? 'runtime'}] ${diagnostic.message} Next: ${diagnostic.nextAction}`
      );
    }
    if (result.healthReport) {
      logger.log(
        `[summary] ${result.healthReport.status} source=${result.healthReport.sourceVersion ?? 'unknown'} built=${result.healthReport.builtVersion ?? 'unknown'} steps=${result.healthReport.steps.passed}/${result.healthReport.steps.total} verification=${result.healthReport.verification.passed}/${result.healthReport.verification.total} files=${result.healthReport.generatedFiles}`
      );
    }
    logger.log(JSON.stringify(result, null, 2));
    if (result.status === 'interrupted') {
      return 130;
    }

    return result.status === 'passed' ? 0 : 1;
  } catch (error) {
    if (error.code === 'INTERRUPTED') {
      return 130;
    }

    logger.error(error.message);
    return 1;
  } finally {
    signalHandlers.unregister(handleInterrupt);
  }
}

async function maybeExecuteBuildRunner(
  filePath,
  {
    logger,
    loadIntentFile,
    loadRuntimeConfig,
    validateRuntimeConfig,
    createBuildRunnerPlan,
    createDockerBuildRunner,
    createDockerImageEnsurer,
    getAxiomPackageRoot,
    environment,
    projectRoot,
    signalHandlers
  }
) {
  let file;
  let runtimeConfig;
  const resolvedFilePath = path.resolve(filePath);

  try {
    file = await loadIntentFile(resolvedFilePath);
    runtimeConfig = validateRuntimeConfig(await loadRuntimeConfig(resolvedFilePath));
  } catch (error) {
    logger.error(error.message);
    return 1;
  }

  const buildSecurity = file.definition.security?.build;
  if (!buildSecurity || buildSecurity.mode === 'local') {
    return undefined;
  }

  if (buildSecurity.mode === 'vm') {
    logger.error(
      '[error:UNSUPPORTED_BUILD_RUNNER] security.build.mode "vm" is validated but VM build runners are not implemented yet.'
    );
    return 1;
  }

  if (buildSecurity.mode !== 'docker') {
    return undefined;
  }

  const controller = new AbortController();
  const handleInterrupt = () => {
    controller.abort();
  };
  signalHandlers.register(handleInterrupt);

  try {
    const runnerPlan = createBuildRunnerPlan({
      intentPath: filePath,
      runtimeConfigPath: path.join(path.dirname(resolvedFilePath), 'axiom.config.js'),
      runtimeConfig,
      buildSecurity,
      environment,
      projectRoot
    });

    const axiomPackageRoot = getAxiomPackageRoot();
    const dockerfilePath = path.resolve(
      axiomPackageRoot,
      runnerPlan.buildSecurity.dockerfile
    );

    const writeThrough = (event) => {
      logger[event.stream === 'stderr' ? 'error' : 'log'](event.chunk.trimEnd());
    };

    logger.log(`Building Axiom runner image ${runnerPlan.buildSecurity.image} ...`);

    const ensurer = createDockerImageEnsurer();
    await ensurer.ensure(
      {
        image: runnerPlan.buildSecurity.image,
        dockerfile: dockerfilePath,
        buildContext: axiomPackageRoot
      },
      { signal: controller.signal, onOutput: writeThrough }
    );

    const dockerBuildRunner = createDockerBuildRunner();
    const result = await dockerBuildRunner.run(runnerPlan, {
      signal: controller.signal,
      onOutput: writeThrough
    });

    return result.exitCode ?? 1;
  } catch (error) {
    if (error.code === 'ABORT_ERR' || controller.signal.aborted) {
      return 130;
    }

    logger.error(error.message);
    return 1;
  } finally {
    signalHandlers.unregister(handleInterrupt);
  }
}

const defaultSignalHandlers = {
  register(handler) {
    process.once('SIGINT', handler);
  },
  unregister(handler) {
    process.off('SIGINT', handler);
  }
};

async function resolveBuildTargetDefault(cwd) {
  const entries = await fs.readdir(cwd, { withFileTypes: true });
  const candidates = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.axiom.js'))
    .map((entry) => entry.name)
    .sort();

  if (candidates.length === 0) {
    throw new Error(
      `No .axiom.js file found in ${cwd}. Run \`ax build <file.axiom.js>\` or add a local intent file.`
    );
  }

  if (candidates.length > 1) {
    throw new Error(
      `Multiple .axiom.js files found in ${cwd}: ${candidates.join(', ')}. Run \`ax build <file.axiom.js>\`.`
    );
  }

  return path.join(cwd, candidates[0]);
}
