import { describe, expect, it, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { initCommand } from '../../src/cli/init-command.js';

describe('initCommand', () => {
  it('prints usage when called without --existing <path>', async () => {
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await initCommand([], {
      inspectExistingProject: vi.fn(),
      writeStarterIntentFile: vi.fn(),
      logger
    });

    expect(exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith('Usage: axiom init --existing <path>');
  });

  it('writes a starter intent file for a library-style Node project', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'axiom-init-library-'));
    await fs.writeFile(
      path.join(root, 'package.json'),
      JSON.stringify(
        {
          name: 'demo-lib',
          scripts: {
            test: 'vitest run'
          }
        },
        null,
        2
      ),
      'utf8'
    );

    const logger = { log: vi.fn(), error: vi.fn() };
    const exitCode = await initCommand(['--existing', root], {
      inspectExistingProject,
      writeStarterIntentFile,
      logger
    });

    const starterPath = path.join(root, 'demo-lib.axiom.js');
    const starter = await fs.readFile(starterPath, 'utf8');

    expect(exitCode).toBe(0);
    expect(starter).toContain('title: "demo-lib"');
    expect(starter).toContain('description: "A starter Axiom file for the existing demo-lib project."');
    expect(starter).toContain('library: {');
    expect(starter).toContain('test: "vitest run"');
    expect(logger.log).toHaveBeenCalledWith(
      `Wrote starter intent file: ${starterPath}`
    );
    expect(logger.log).toHaveBeenCalledWith(
      'Next: add axiom.config.js, refine the generated intent, then run `axiom analyze <file.axiom.js>`.'
    );
  });

  it('detects a web project when express and public/ are present', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'axiom-init-web-'));
    await fs.writeFile(
      path.join(root, 'package.json'),
      JSON.stringify(
        {
          name: 'demo-web',
          dependencies: {
            express: '^4.0.0'
          },
          scripts: {
            test: 'npm test'
          }
        },
        null,
        2
      ),
      'utf8'
    );
    await fs.mkdir(path.join(root, 'public'));

    const logger = { log: vi.fn(), error: vi.fn() };
    const exitCode = await initCommand(['--existing', root], {
      inspectExistingProject,
      writeStarterIntentFile,
      logger
    });

    const starterPath = path.join(root, 'demo-web.axiom.js');
    const starter = await fs.readFile(starterPath, 'utf8');

    expect(exitCode).toBe(0);
    expect(starter).toContain('web: {');
    expect(starter).toContain('kind: "full-stack"');
    expect(starter).toContain('test: "npm test"');
  });
});

async function inspectExistingProject(targetPath) {
  const packageJsonPath = path.join(targetPath, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  const publicDirExists = await fs
    .stat(path.join(targetPath, 'public'))
    .then((stat) => stat.isDirectory())
    .catch(() => false);

  return {
    targetPath,
    projectName: packageJson.name ?? path.basename(targetPath),
    testCommand: packageJson.scripts?.test ?? 'npm test',
    domain:
      packageJson.dependencies?.express || publicDirExists
        ? 'web'
        : 'library'
  };
}

async function writeStarterIntentFile(targetPath, filename, content) {
  await fs.writeFile(path.join(targetPath, filename), content, 'utf8');
}
