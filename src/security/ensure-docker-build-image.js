/**
 * Purpose: Ensure the Docker build runner image exists locally before launching the runner.
 * Responsibilities:
 * - Check whether the configured image tag is present via `docker image inspect`.
 * - Build the image from the provided Dockerfile and context when it is missing.
 * - Stream build output through the shared onOutput callback.
 */
import { spawn } from 'node:child_process';

export function createDockerImageEnsurer({ processRunner = spawnProcess } = {}) {
  return {
    async ensure({ image, dockerfile, buildContext }, { onOutput, signal } = {}) {
      const inspect = await processRunner(
        'docker',
        ['image', 'inspect', image],
        { signal }
      );

      if (inspect.exitCode === 0) {
        return { built: false };
      }

      const build = await processRunner(
        'docker',
        ['build', '-f', dockerfile, '-t', image, buildContext],
        { signal, onOutput }
      );

      if (build.exitCode !== 0) {
        const error = new Error(`Docker runner image build failed with exit code ${build.exitCode}`);
        error.code = 'DOCKER_BUILD_RUNNER_IMAGE_BUILD_FAILED';
        throw error;
      }

      return { built: true };
    }
  };
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
