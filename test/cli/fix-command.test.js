import { describe, expect, it, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fixCommand } from '../../src/cli/fix-command.js';

describe('fixCommand', () => {
  it('prints usage when called without a target file and fix id', async () => {
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await fixCommand([], {
      loadIntentFile: vi.fn(),
      logger
    });

    expect(exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith('Usage: ax fix <file.axiom.js> --apply <fix-id>');
  });

  it('removes the redundant default compact build block when explicitly requested', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'axiom-fix-'));
    const filePath = path.join(root, 'echo-tool.axiom.js');
    await fs.writeFile(
      filePath,
      `import { intent } from "@science451/intent-runtime";

export default intent(
  {
    meta: {
      title: "Echo Tool"
    },
    runtime: {
      targets: ["node"]
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
      command: "echo-tool"
    }
  },
  async () => ({ ok: true })
);
`,
      'utf8'
    );

    const logger = { log: vi.fn(), error: vi.fn() };
    const exitCode = await fixCommand([filePath, '--apply', 'compact-build-defaults'], {
      loadIntentFile: vi.fn(async () => ({
        definition: {
          runtime: { targets: ['node'] },
          cli: { command: 'echo-tool' },
          build: {
            system: 'npm',
            test_runner: 'npm',
            commands: {
              install: 'npm install',
              test: 'npm test'
            }
          }
        }
      })),
      logger
    });

    const updated = await fs.readFile(filePath, 'utf8');

    expect(exitCode).toBe(0);
    expect(updated).not.toContain('build: {');
    expect(updated).toContain('cli: {');
    expect(logger.log).toHaveBeenCalledWith(JSON.stringify({
      status: 'fixed',
      targetFile: filePath,
      applied: [
        {
          id: 'compact-build-defaults',
          message: 'Removed the redundant default npm build block.'
        }
      ]
    }, null, 2));
  });

  it('reports unsupported fix ids without mutating the source file', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'axiom-fix-unsupported-'));
    const filePath = path.join(root, 'echo-tool.axiom.js');
    const source = 'export default {};\n';
    await fs.writeFile(filePath, source, 'utf8');
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await fixCommand([filePath, '--apply', 'unknown-fix'], {
      loadIntentFile: vi.fn(async () => ({
        definition: {
          runtime: { targets: ['node'] },
          cli: { command: 'echo-tool' }
        }
      })),
      logger
    });

    expect(exitCode).toBe(1);
    expect(await fs.readFile(filePath, 'utf8')).toBe(source);
    expect(logger.error).toHaveBeenCalledWith('Unsupported fix id: unknown-fix');
  });

  it('reports when the requested fix does not apply to the target file', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'axiom-fix-not-applicable-'));
    const filePath = path.join(root, 'echo-tool.axiom.js');
    const source = 'export default {};\n';
    await fs.writeFile(filePath, source, 'utf8');
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await fixCommand([filePath, '--apply', 'compact-build-defaults'], {
      loadIntentFile: vi.fn(async () => ({
        definition: {
          runtime: { targets: ['node'] },
          cli: { command: 'echo-tool' }
        }
      })),
      logger
    });

    expect(exitCode).toBe(1);
    expect(await fs.readFile(filePath, 'utf8')).toBe(source);
    expect(logger.error).toHaveBeenCalledWith(
      'Fix `compact-build-defaults` does not apply to this intent file.'
    );
  });
});
