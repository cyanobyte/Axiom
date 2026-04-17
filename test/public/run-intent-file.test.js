import { describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { runIntentFile } from '../../src/index.js';

describe('runIntentFile', () => {
  it('loads the intent file, loads sibling config, and runs the workflow', async () => {
    const result = await runIntentFile('examples/basic/counter-webapp.axiom.js');

    expect(result.status).toBe('passed');
    expect(result.healthReport).toMatchObject({
      intentFile: path.resolve('examples/basic/counter-webapp.axiom.js'),
      sourceVersion: '1.0.0',
      builtVersion: '1.0.0',
      status: 'passed',
      steps: {
        total: 4,
        passed: 4,
        failed: 0
      },
      verification: {
        total: 4,
        passed: 4,
        failed: 0
      }
    });
    expect(result.stepResults.map((step) => step.stepId)).toEqual([
      'brief',
      'plan',
      'implement',
      'test'
    ]);
  });

  it('cleans stale generated files when the intent version changes', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'axiom-run-file-'));
    const workspaceRoot = path.join(root, 'generated');
    const intentPath = path.join(root, 'fixture.axiom.js');
    const configPath = path.join(root, 'axiom.config.js');
    const runtimeModuleUrl = pathToFileURL(path.resolve('src/index.js')).href;

    await fs.writeFile(
      configPath,
      `export default {
  agents: {
    briefing: { provider: "fake", responses: { briefing: { ok: true } } }
  },
  workspace: { root: ${JSON.stringify(workspaceRoot)} },
  workers: { shell: { type: "fake-shell" } },
  artifacts: { root: "./reports" }
};
`,
      'utf8'
    );

    await fs.writeFile(
      intentPath,
      createFixtureIntent({
        runtimeModuleUrl,
        version: '1.0.0',
        outputFile: 'dist/old.txt',
        outputText: 'old build'
      }),
      'utf8'
    );

    await runIntentFile(intentPath);

    expect(await fs.readFile(path.join(workspaceRoot, 'dist/old.txt'), 'utf8')).toBe('old build');

    await fs.writeFile(
      intentPath,
      createFixtureIntent({
        runtimeModuleUrl,
        version: '1.1.0',
        outputFile: 'dist/new.txt',
        outputText: 'new build'
      }),
      'utf8'
    );

    await runIntentFile(intentPath);

    await expect(fs.readFile(path.join(workspaceRoot, 'dist/old.txt'), 'utf8')).rejects.toThrow();
    await expect(fs.readFile(path.join(workspaceRoot, 'dist/new.txt'), 'utf8')).resolves.toBe('new build');
    await expect(fs.readFile(path.join(workspaceRoot, '.axiom-build.json'), 'utf8')).resolves.toContain('"intentVersion": "1.1.0"');

    const rerun = await runIntentFile(intentPath);
    expect(rerun.healthReport).toMatchObject({
      intentFile: intentPath,
      sourceVersion: '1.1.0',
      builtVersion: '1.1.0',
      generatedFiles: 2
    });
  });

  it('writes generated files to runner override roots inside AXIOM_RUNNER mode', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'axiom-runner-'));
    const generatedRoot = path.join(root, 'runner-generated');
    const reportsRoot = path.join(root, 'runner-reports');
    const intentPath = path.join(root, 'app.axiom.js');
    const configPath = path.join(root, 'axiom.config.js');
    const runtimeModuleUrl = pathToFileURL(path.resolve('src/index.js')).href;

    await fs.writeFile(
      configPath,
      `export default {
  agents: {
    briefing: { provider: "fake", responses: { briefing: { ok: true } } }
  },
  workspace: { root: ${JSON.stringify(path.join(root, 'host-generated'))} },
  workers: { shell: { type: "fake-shell" } },
  artifacts: { root: "./reports" }
};
`,
      'utf8'
    );

    await fs.writeFile(
      intentPath,
      createFixtureIntent({
        runtimeModuleUrl,
        version: '1.0.0',
        outputFile: 'app.txt',
        outputText: 'runner file'
      }),
      'utf8'
    );

    const result = await runIntentFile(intentPath, {
      environment: {
        AXIOM_RUNNER: '1',
        AXIOM_WORKSPACE_ROOT: generatedRoot,
        AXIOM_ARTIFACTS_ROOT: reportsRoot
      }
    });

    expect(result.status).toBe('passed');
    await expect(fs.readFile(path.join(generatedRoot, 'app.txt'), 'utf8')).resolves.toBe('runner file');
    await expect(fs.access(path.join(root, 'host-generated'))).rejects.toThrow();
  });
});

function createFixtureIntent({ runtimeModuleUrl, version, outputFile, outputText }) {
  return `import { intent, must, outcome } from ${JSON.stringify(runtimeModuleUrl)};

export default intent(
  {
    id: "fixture-build",
    meta: { title: "Fixture Build", version: ${JSON.stringify(version)} },
    what: { capability: "fixture", description: "Fixture runtime" },
    why: { problem: "Test build metadata", value: "Clean stale generated files" },
    scope: { includes: [], excludes: [] },
    runtime: { languages: ["javascript"], targets: ["node"], platforms: ["linux"] },
    constraints: [must("must-exist", "Constraint exists")],
    outcomes: [outcome("works", "It works")],
    verification: { intent: [], outcome: [] },
    library: { kind: "package" }
  },
  async (ctx) => {
    await ctx.step("implement", async () => {
      await ctx.workspace.write(${JSON.stringify(outputFile)}, ${JSON.stringify(outputText)});
      return { path: ${JSON.stringify(outputFile)} };
    });

    return { ok: true };
  }
);
`;
}
