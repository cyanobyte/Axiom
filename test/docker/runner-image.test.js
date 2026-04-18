import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';

const imageTag = 'axiom-build-node-webapp:local';

describe('node-webapp Docker runner image', () => {
  it('defines the runtime image contract and package scripts', async () => {
    const dockerfile = await fs.readFile('docker/runner/node-webapp/Dockerfile', 'utf8');
    const readme = await fs.readFile('docker/runner/node-webapp/README.md', 'utf8');
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));

    expect(dockerfile).toContain('FROM node:22-bookworm');
    expect(dockerfile).toContain('RUN npm ci --omit=optional');
    expect(dockerfile).toContain('RUN npm install -g @openai/codex@0.118.0');
    expect(dockerfile).toContain('RUN npm link');
    expect(dockerfile).toContain('ENV HOME=/home/node');
    expect(dockerfile).toContain('USER node');
    expect(dockerfile).toContain('WORKDIR /workspace/source');
    expect(dockerfile).toContain('/workspace/generated');
    expect(dockerfile).toContain('/workspace/reports');
    expect(packageJson.scripts['docker:runner:build']).toBe(
      `docker build -f docker/runner/node-webapp/Dockerfile -t ${imageTag} .`
    );
    expect(packageJson.scripts['docker:runner:smoke']).toBe(
      `docker run --rm ${imageTag} sh -lc "command -v ax"`
    );
    expect(packageJson.scripts['docker:runner:codex-live']).toBe(
      'node bin/ax.js build examples/docker-codex-counter/counter-webapp.axiom.js'
    );
    expect(readme).toContain(imageTag);
  });
});
