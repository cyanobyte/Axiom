import { describe, expect, it, vi } from 'vitest';
import { createDockerImageEnsurer } from '../../src/security/ensure-docker-build-image.js';

const params = {
  image: 'axiom-build-node-webapp:local',
  dockerfile: '/axiom/docker/runner/node-webapp/Dockerfile',
  buildContext: '/axiom'
};

describe('createDockerImageEnsurer', () => {
  it('returns { built: false } when the image already exists', async () => {
    const processRunner = vi.fn(async () => ({ exitCode: 0 }));
    const ensurer = createDockerImageEnsurer({ processRunner });

    const result = await ensurer.ensure(params);

    expect(result).toEqual({ built: false });
    expect(processRunner).toHaveBeenCalledTimes(1);
    expect(processRunner).toHaveBeenCalledWith(
      'docker',
      ['image', 'inspect', 'axiom-build-node-webapp:local'],
      { signal: undefined }
    );
  });

  it('runs docker build with the Dockerfile, tag, and context when the image is missing', async () => {
    const processRunner = vi
      .fn()
      .mockResolvedValueOnce({ exitCode: 1 })
      .mockResolvedValueOnce({ exitCode: 0 });
    const ensurer = createDockerImageEnsurer({ processRunner });
    const onOutput = vi.fn();

    const result = await ensurer.ensure(params, { onOutput, signal: 'signal-value' });

    expect(result).toEqual({ built: true });
    expect(processRunner).toHaveBeenNthCalledWith(
      2,
      'docker',
      [
        'build',
        '-f',
        '/axiom/docker/runner/node-webapp/Dockerfile',
        '-t',
        'axiom-build-node-webapp:local',
        '/axiom'
      ],
      { signal: 'signal-value', onOutput }
    );
  });

  it('throws with DOCKER_BUILD_RUNNER_IMAGE_BUILD_FAILED when the build fails', async () => {
    const processRunner = vi
      .fn()
      .mockResolvedValueOnce({ exitCode: 1 })
      .mockResolvedValueOnce({ exitCode: 2 });
    const ensurer = createDockerImageEnsurer({ processRunner });

    await expect(ensurer.ensure(params)).rejects.toMatchObject({
      code: 'DOCKER_BUILD_RUNNER_IMAGE_BUILD_FAILED',
      message: 'Docker runner image build failed with exit code 2'
    });
  });

  it('does not attempt a build when inspect succeeds, and does not forward onOutput on inspect', async () => {
    const processRunner = vi.fn(async () => ({ exitCode: 0 }));
    const ensurer = createDockerImageEnsurer({ processRunner });
    const onOutput = vi.fn();

    await ensurer.ensure(params, { onOutput });

    expect(processRunner).toHaveBeenCalledTimes(1);
    expect(processRunner.mock.calls[0][2]).toEqual({ signal: undefined });
    expect(onOutput).not.toHaveBeenCalled();
  });
});
