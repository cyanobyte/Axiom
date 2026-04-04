import { describe, expect, it, vi } from 'vitest';
import { analyzeCommand } from '../../src/cli/analyze-command.js';

describe('analyzeCommand', () => {
  it('prints usage when no file path is provided', async () => {
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await analyzeCommand([], {
      loadIntentFile: vi.fn(),
      readSourceFile: vi.fn(),
      loadRuntimeConfig: vi.fn(),
      validateRuntimeConfig: vi.fn(),
      checkReadiness: vi.fn(),
      logger
    });

    expect(exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith('Usage: ax analyze <file.axiom.js>');
  });

  it('prints a passing structured analysis result for a valid file', async () => {
    const logger = { log: vi.fn(), error: vi.fn() };
    const loadIntentFile = vi.fn(async () => ({
      definition: {
        meta: { title: 'Echo Tool', summary: 'Prints the provided message.' },
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
    }));
    const loadRuntimeConfig = vi.fn(async () => ({
      agents: { planner: { provider: 'fake' } },
      workers: { shell: { type: 'fake-shell' } },
      workspace: { root: './generated' },
      artifacts: { root: './reports' }
    }));

    const exitCode = await analyzeCommand(['examples/cli/echo-tool.axiom.js'], {
      loadIntentFile,
      readSourceFile: vi.fn(async () => `
        export default {
          meta: {
            title: "Echo Tool",
            summary: "Prints the provided message."
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
        };
      `),
      loadRuntimeConfig,
      validateRuntimeConfig: vi.fn((config) => config),
      checkReadiness: vi.fn(() => []),
      logger
    });

    expect(exitCode).toBe(0);
    expect(loadIntentFile).toHaveBeenCalledWith('examples/cli/echo-tool.axiom.js');
    expect(loadRuntimeConfig).toHaveBeenCalledWith('examples/cli/echo-tool.axiom.js');
    expect(logger.log).toHaveBeenCalledWith(JSON.stringify({
      status: 'passed',
      targetFile: 'examples/cli/echo-tool.axiom.js',
      errors: [],
      warnings: [],
      suggestions: [
        {
          id: 'compact-build-defaults',
          kind: 'authoring',
          section: 'build',
          message: 'Compact CLI intents can omit the default npm build configuration.',
          nextAction: 'Remove build and rely on compact defaults unless this project needs custom commands.',
          fix: {
            type: 'remove-default-build',
            label: 'Remove redundant default npm build block from a compact CLI intent.'
          }
        }
      ]
    }, null, 2));
  });

  it('returns a structured error when the sibling runtime config is missing', async () => {
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await analyzeCommand(['docs/superpowers/examples/todo-app.axiom.js'], {
      loadIntentFile: vi.fn(async () => ({
        definition: {
          meta: { title: 'Todo App' },
          runtime: { targets: ['node'] }
        }
      })),
      readSourceFile: vi.fn(async () => `export default {};`),
      loadRuntimeConfig: vi.fn(async () => {
        throw new Error('Missing runtime config: axiom.config.js');
      }),
      validateRuntimeConfig: vi.fn(),
      checkReadiness: vi.fn(() => []),
      logger
    });

    expect(exitCode).toBe(1);
    expect(logger.log).toHaveBeenCalledWith(JSON.stringify({
      status: 'invalid',
      targetFile: 'docs/superpowers/examples/todo-app.axiom.js',
      errors: [
        {
          kind: 'config',
          section: 'runtime-config',
          message: 'Missing runtime config: axiom.config.js',
          nextAction: 'Add axiom.config.js next to the target intent file.'
        }
      ],
      warnings: [],
      suggestions: []
    }, null, 2));
  });

  it('collects config and readiness findings without mutating source', async () => {
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = await analyzeCommand(['examples/basic/counter-webapp.axiom.js'], {
      loadIntentFile: vi.fn(async () => ({
        definition: {
          meta: { title: 'Counter App' },
          runtime: { targets: ['node', 'browser'] },
          web: { kind: 'full-stack' }
        }
      })),
      readSourceFile: vi.fn(async () => `export default {};`),
      loadRuntimeConfig: vi.fn(async () => ({
        workers: { shell: { type: 'fake-shell' } },
        workspace: { root: './generated' },
        artifacts: { root: './reports' }
      })),
      validateRuntimeConfig: vi.fn(() => {
        throw new Error('Runtime config must define at least one agent');
      }),
      checkReadiness: vi.fn(() => [
        {
          kind: 'readiness',
          message: 'Missing build.commands.test for full-stack web app execution.',
          nextAction: 'Update the .axiom.js source so the missing execution detail is declared before rerunning.'
        }
      ]),
      logger
    });

    expect(exitCode).toBe(1);
    expect(logger.log).toHaveBeenCalledWith(JSON.stringify({
      status: 'invalid',
      targetFile: 'examples/basic/counter-webapp.axiom.js',
      errors: [
        {
          kind: 'config',
          section: 'runtime-config',
          message: 'Runtime config must define at least one agent',
          nextAction: 'Update axiom.config.js so the runtime wiring is complete before running analyze again.'
        },
        {
          kind: 'readiness',
          section: 'runtime',
          message: 'Missing build.commands.test for full-stack web app execution.',
          nextAction: 'Update the .axiom.js source so the missing execution detail is declared before rerunning.'
        }
      ],
      warnings: [],
      suggestions: []
    }, null, 2));
  });
});
