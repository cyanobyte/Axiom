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
});
