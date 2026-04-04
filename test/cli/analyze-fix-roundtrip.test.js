import { describe, expect, it, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { analyzeCommand } from '../../src/cli/analyze-command.js';
import { fixCommand } from '../../src/cli/fix-command.js';
import { loadIntentFile } from '../../src/public/load-intent-file.js';

describe('analyze/fix roundtrip', () => {
  it('removes the compact-build suggestion after applying the explicit fix', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'axiom-roundtrip-'));
    const filePath = path.join(root, 'echo-tool.axiom.js');
    await fs.writeFile(
      filePath,
      `import { intent } from "@science451/intent-runtime";

export default intent(
  {
    meta: {
      title: "Echo Tool"
    },
    what: {
      capability: "echo_cli_tool",
      description: "Users can run a command that prints the provided message."
    },
    runtime: {
      languages: ["javascript"],
      targets: ["node"],
      platforms: ["linux", "macos", "windows"]
    },
    build: {
      system: "npm",
      test_runner: "npm",
      commands: {
        install: "npm install",
        test: "npm test"
      }
    },
    cli: {
      command: "echo-tool",
      arguments: ["<message>"],
      behaviors: [
        "prints the provided message to stdout",
        "shows a usage error when the message is missing"
      ]
    }
  },
  async () => ({ ok: true })
);
`,
      'utf8'
    );

    const analyzeLoggerBefore = { log: vi.fn(), error: vi.fn() };
    const analyzeExitCodeBefore = await analyzeCommand([filePath], {
      loadIntentFile,
      loadRuntimeConfig: vi.fn(async () => ({
        agents: { planner: { provider: 'fake' } },
        workers: { shell: { type: 'fake-shell' } },
        workspace: { root: './generated' },
        artifacts: { root: './reports' }
      })),
      validateRuntimeConfig: vi.fn((config) => config),
      checkReadiness: vi.fn(() => []),
      logger: analyzeLoggerBefore
    });

    expect(analyzeExitCodeBefore).toBe(0);
    const analysisBefore = JSON.parse(analyzeLoggerBefore.log.mock.calls[0][0]);
    expect(analysisBefore.suggestions).toContainEqual(
      expect.objectContaining({
        id: 'compact-build-defaults'
      })
    );

    const fixLogger = { log: vi.fn(), error: vi.fn() };
    const fixExitCode = await fixCommand([filePath, '--apply', 'compact-build-defaults'], {
      loadIntentFile,
      logger: fixLogger
    });

    expect(fixExitCode).toBe(0);

    const analyzeLoggerAfter = { log: vi.fn(), error: vi.fn() };
    const analyzeExitCodeAfter = await analyzeCommand([filePath], {
      loadIntentFile,
      loadRuntimeConfig: vi.fn(async () => ({
        agents: { planner: { provider: 'fake' } },
        workers: { shell: { type: 'fake-shell' } },
        workspace: { root: './generated' },
        artifacts: { root: './reports' }
      })),
      validateRuntimeConfig: vi.fn((config) => config),
      checkReadiness: vi.fn(() => []),
      logger: analyzeLoggerAfter
    });

    expect(analyzeExitCodeAfter).toBe(0);
    const analysisAfter = JSON.parse(analyzeLoggerAfter.log.mock.calls[0][0]);
    expect(analysisAfter.suggestions).toEqual([]);
  });

  it('clears a fixable error, warning, and suggestion one at a time', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'axiom-mixed-roundtrip-'));
    const filePath = path.join(root, 'counter-webapp.axiom.js');
    await fs.writeFile(
      filePath,
      `import { intent } from "@science451/intent-runtime";

export default intent(
  {
    meta: {
      title: "Counter App"
    },
    what: {
      capability: "counter_webapp",
      description: "A small web app with a counter."
    },
    runtime: {
      languages: ["javascript"],
      targets: ["node", "browser"],
      platforms: ["linux", "macos", "windows"]
    },
    scope: {
      includes: [],
      excludes: []
    },
    build: {
      system: "npm",
      test_runner: "npm",
      commands: {
        install: "npm install"
      }
    },
    web: {
      kind: "full-stack",
      frontend: {
        framework: "vanilla"
      },
      api: {
        endpoints: ["/api/counter"]
      }
    },
    architecture: {
      components: ["ui", "server"]
    }
  },
  async () => ({ ok: true })
);
`,
      'utf8'
    );

    const configDeps = {
      loadRuntimeConfig: vi.fn(async () => ({
        agents: { planner: { provider: 'fake' } },
        workers: { shell: { type: 'fake-shell' } },
        workspace: { root: './generated' },
        artifacts: { root: './reports' }
      })),
      validateRuntimeConfig: vi.fn((config) => config)
    };

    const analyzeLoggerInitial = { log: vi.fn(), error: vi.fn() };
    const initialExitCode = await analyzeCommand([filePath], {
      loadIntentFile,
      checkReadiness: vi.fn(() => [
        {
          kind: 'readiness',
          message: 'Missing build.commands.test for full-stack web app execution.',
          nextAction: 'Update the .axiom.js source so the missing execution detail is declared before rerunning.'
        }
      ]),
      logger: analyzeLoggerInitial,
      ...configDeps
    });

    expect(initialExitCode).toBe(1);
    const initialAnalysis = JSON.parse(analyzeLoggerInitial.log.mock.calls[0][0]);
    expect(initialAnalysis.errors).toContainEqual(
      expect.objectContaining({ id: 'web-build-test-command' })
    );
    expect(initialAnalysis.warnings).toContainEqual(
      expect.objectContaining({ id: 'meta-summary' })
    );
    expect(initialAnalysis.suggestions).toContainEqual(
      expect.objectContaining({ id: 'empty-scope' })
    );

    const fixLoggerError = { log: vi.fn(), error: vi.fn() };
    expect(
      await fixCommand([filePath, '--apply', 'web-build-test-command'], {
        loadIntentFile,
        logger: fixLoggerError
      })
    ).toBe(0);

    const analyzeLoggerAfterError = { log: vi.fn(), error: vi.fn() };
    const afterErrorExitCode = await analyzeCommand([filePath], {
      loadIntentFile,
      checkReadiness: vi.fn(() => []),
      logger: analyzeLoggerAfterError,
      ...configDeps
    });

    expect(afterErrorExitCode).toBe(0);
    const afterErrorAnalysis = JSON.parse(analyzeLoggerAfterError.log.mock.calls[0][0]);
    expect(afterErrorAnalysis.errors).toEqual([]);
    expect(afterErrorAnalysis.warnings).toContainEqual(
      expect.objectContaining({ id: 'meta-summary' })
    );
    expect(afterErrorAnalysis.suggestions).toContainEqual(
      expect.objectContaining({ id: 'empty-scope' })
    );

    const fixLoggerWarning = { log: vi.fn(), error: vi.fn() };
    expect(
      await fixCommand([filePath, '--apply', 'meta-summary'], {
        loadIntentFile,
        logger: fixLoggerWarning
      })
    ).toBe(0);

    const analyzeLoggerAfterWarning = { log: vi.fn(), error: vi.fn() };
    const afterWarningExitCode = await analyzeCommand([filePath], {
      loadIntentFile,
      checkReadiness: vi.fn(() => []),
      logger: analyzeLoggerAfterWarning,
      ...configDeps
    });

    expect(afterWarningExitCode).toBe(0);
    const afterWarningAnalysis = JSON.parse(analyzeLoggerAfterWarning.log.mock.calls[0][0]);
    expect(afterWarningAnalysis.errors).toEqual([]);
    expect(afterWarningAnalysis.warnings).toEqual([]);
    expect(afterWarningAnalysis.suggestions).toContainEqual(
      expect.objectContaining({ id: 'empty-scope' })
    );

    const fixLoggerSuggestion = { log: vi.fn(), error: vi.fn() };
    expect(
      await fixCommand([filePath, '--apply', 'empty-scope'], {
        loadIntentFile,
        logger: fixLoggerSuggestion
      })
    ).toBe(0);

    const analyzeLoggerFinal = { log: vi.fn(), error: vi.fn() };
    const finalExitCode = await analyzeCommand([filePath], {
      loadIntentFile,
      checkReadiness: vi.fn(() => []),
      logger: analyzeLoggerFinal,
      ...configDeps
    });

    expect(finalExitCode).toBe(0);
    const finalAnalysis = JSON.parse(analyzeLoggerFinal.log.mock.calls[0][0]);
    expect(finalAnalysis.errors).toEqual([]);
    expect(finalAnalysis.warnings).toEqual([]);
    expect(finalAnalysis.suggestions).toEqual([]);
  });
});
