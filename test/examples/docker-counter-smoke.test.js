import fs from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { loadIntentFile } from '../../src/index.js';

describe('Docker counter smoke fixture', () => {
  it('declares a deterministic Docker-mode counter build and npm smoke script', async () => {
    const file = await loadIntentFile('examples/docker-counter/counter-webapp.axiom.js');
    const config = await import('../../examples/docker-counter/axiom.config.js');
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
    const readme = await fs.readFile('examples/docker-counter/README.md', 'utf8');

    expect(file.definition.id).toBe('counter-webapp-docker');
    expect(file.definition.security.build).toMatchObject({
      mode: 'docker',
      profile: 'node-webapp',
      image: 'axiom-build-node-webapp:local'
    });
    expect(config.default.agents.briefing.provider).toBe('fake');
    expect(config.default.agents.planner.provider).toBe('fake');
    expect(config.default.agents.coder.provider).toBe('fake');
    expect(config.default.workspace.root).toBe('./examples/docker-counter/generated');
    expect(packageJson.scripts['docker:runner:integration']).toBe(
      'node bin/ax.js build examples/docker-counter/counter-webapp.axiom.js'
    );
    expect(readme).toContain('npm run docker:runner:integration');
  });
});
