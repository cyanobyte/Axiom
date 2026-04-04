import { describe, expect, it } from 'vitest';
import { intent, runIntent } from '../../src/index.js';

describe('runtime context generation helpers', () => {
  it('runs the briefing agent with the current intent', async () => {
    const agentCalls = [];
    const file = intent(
      {
        id: 'generate-brief-sample',
        meta: { title: 'Generate Brief Sample' },
        what: { capability: 'sample', description: 'Sample runtime' },
        why: { problem: 'Need smaller brief steps', value: 'Reduce briefing boilerplate' },
        scope: { includes: [], excludes: [] },
        runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
        constraints: [],
        outcomes: [],
        verification: { intent: [], outcome: [] },
        library: { kind: 'package' }
      },
      async (ctx) => {
        return ctx.step('brief', () => ctx.generate.brief());
      }
    );

    const adapters = {
      workspace: {
        root() {
          return '/tmp/axiom-test';
        },
        async read() {
          return '';
        },
        async write() {},
        async patch() {}
      },
      artifacts: {
        async read() {
          return null;
        }
      },
      ai: {
        agent(name) {
          return {
            async run(input) {
              agentCalls.push({ name, input });
              return {
                summary: input.intent.meta.title
              };
            }
          };
        }
      },
      workers: {
        worker() {
          return {
            async exec(spec) {
              return { ...spec, exitCode: 0 };
            }
          };
        }
      },
      checkpoint: {
        async approval() {
          return { accepted: true };
        },
        async choice() {
          return { value: null };
        },
        async input() {
          return { value: null };
        }
      }
    };

    const result = await runIntent(file, adapters);

    expect(result.status).toBe('passed');
    expect(agentCalls).toHaveLength(1);
    expect(agentCalls[0].name).toBe('briefing');
    expect(agentCalls[0].input.intent.meta.title).toBe('Generate Brief Sample');
    expect(result.finalValue).toEqual({
      summary: 'Generate Brief Sample'
    });
  });

  it('verifies intent output against an expected object shape', async () => {
    const file = intent(
      {
        id: 'verify-intent-shape-sample',
        meta: { title: 'Verify Intent Shape Sample' },
        what: { capability: 'sample', description: 'Sample runtime' },
        why: { problem: 'Need smaller intent verification steps', value: 'Reduce plan coverage boilerplate' },
        scope: { includes: [], excludes: [] },
        runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
        constraints: [{ id: 'must-plan', text: 'The plan covers the workflow.', severity: 'error' }],
        outcomes: [],
        verification: {
          intent: [{ id: 'plan-covers-core', covers: ['must-plan'] }],
          outcome: []
        },
        library: { kind: 'package' }
      },
      async (ctx) => {
        await ctx.verify.intentShape('plan-covers-core', {
          value: {
            usesNodeCli: true,
            includesTests: true
          },
          expected: {
            usesNodeCli: true,
            includesTests: true
          }
        });

        return { ok: true };
      }
    );

    const result = await runIntent(file, {
      workspace: {
        root() {
          return '/tmp/axiom-test';
        },
        async read() {
          return '';
        },
        async write() {},
        async patch() {}
      },
      artifacts: {
        async read() {
          return null;
        }
      },
      ai: {
        agent() {
          return {
            async run(input) {
              return input;
            }
          };
        }
      },
      workers: {
        worker() {
          return {
            async exec(spec) {
              return { ...spec, exitCode: 0 };
            }
          };
        }
      },
      checkpoint: {
        async approval() {
          return { accepted: true };
        },
        async choice() {
          return { value: null };
        },
        async input() {
          return { value: null };
        }
      }
    });

    expect(result.status).toBe('passed');
    expect(result.verification).toEqual([
      {
        verificationId: 'plan-covers-core',
        kind: 'intent',
        status: 'passed',
        covers: ['must-plan'],
        evidence: [
          {
            usesNodeCli: true,
            includesTests: true
          }
        ],
        diagnostics: [],
        severity: 'error'
      }
    ]);
  });

  it('verifies an outcome from a report artifact', async () => {
    const file = intent(
      {
        id: 'verify-report-sample',
        meta: { title: 'Verify Report Sample' },
        what: { capability: 'sample', description: 'Sample runtime' },
        why: { problem: 'Need smaller verification steps', value: 'Reduce report-check boilerplate' },
        scope: { includes: [], excludes: [] },
        runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
        constraints: [],
        outcomes: [{ id: 'report-works', text: 'The report proves the workflow worked.' }],
        verification: {
          intent: [],
          outcome: [{ id: 'report-check', covers: ['report-works'] }]
        },
        library: { kind: 'package' }
      },
      async (ctx) => {
        await ctx.verify.outcomeReport('report-check', {
          path: 'reports/sample.json',
          passes(report) {
            return report?.ok === true;
          }
        });

        return { ok: true };
      }
    );

    const adapters = {
      workspace: {
        root() {
          return '/tmp/axiom-test';
        },
        async read() {
          return '';
        },
        async write() {},
        async patch() {}
      },
      artifacts: {
        async read(path) {
          if (path === 'reports/sample.json') {
            return { ok: true };
          }

          return null;
        }
      },
      ai: {
        agent() {
          return {
            async run(input) {
              return input;
            }
          };
        }
      },
      workers: {
        worker() {
          return {
            async exec(spec) {
              return { ...spec, exitCode: 0 };
            }
          };
        }
      },
      checkpoint: {
        async approval() {
          return { accepted: true };
        },
        async choice() {
          return { value: null };
        },
        async input() {
          return { value: null };
        }
      }
    };

    const result = await runIntent(file, adapters);

    expect(result.status).toBe('passed');
    expect(result.verification).toEqual([
      {
        verificationId: 'report-check',
        kind: 'outcome',
        status: 'passed',
        covers: ['report-works'],
        evidence: [{ ok: true }],
        diagnostics: [],
        severity: 'error'
      }
    ]);
  });

  it('builds a planner prompt for structured planning', async () => {
    const agentCalls = [];
    const file = intent(
      {
        id: 'generate-plan-sample',
        meta: { title: 'Generate Plan Sample' },
        what: { capability: 'sample', description: 'Sample runtime' },
        why: { problem: 'Need planning helper', value: 'Keep plan steps short' },
        scope: { includes: [], excludes: [] },
        runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
        constraints: [],
        outcomes: [],
        verification: { intent: [], outcome: [] },
        library: { kind: 'package' }
      },
      async (ctx) => {
        return ctx.step('plan', () =>
          ctx.generate.plan({
            instructions: 'Create a concise implementation plan for this sample.',
            context: {
              intent: ctx.intent,
              brief: {
                summary: 'sample brief'
              }
            },
            shape: {
              usesNodeCli: true,
              includesTests: true
            }
          })
        );
      }
    );

    const adapters = {
      workspace: {
        root() {
          return '/tmp/axiom-test';
        },
        async read() {
          return '';
        },
        async write() {},
        async patch() {}
      },
      artifacts: {
        async read() {
          return null;
        }
      },
      ai: {
        agent(name) {
          return {
            async run(input) {
              agentCalls.push({ name, input });
              return {
                usesNodeCli: true,
                includesTests: true
              };
            }
          };
        }
      },
      workers: {
        worker() {
          return {
            async exec(spec) {
              return { ...spec, exitCode: 0 };
            }
          };
        }
      },
      checkpoint: {
        async approval() {
          return { accepted: true };
        },
        async choice() {
          return { value: null };
        },
        async input() {
          return { value: null };
        }
      }
    };

    const result = await runIntent(file, adapters);

    expect(result.status).toBe('passed');
    expect(agentCalls).toHaveLength(1);
    expect(agentCalls[0].name).toBe('planner');
    expect(agentCalls[0].input.prompt).toContain('Create a concise implementation plan for this sample.');
    expect(agentCalls[0].input.prompt).toContain('Return only valid JSON');
    expect(agentCalls[0].input.prompt).toContain('"summary": "sample brief"');
    expect(agentCalls[0].input.prompt).toContain('"usesNodeCli": true');
    expect(result.finalValue).toEqual({
      usesNodeCli: true,
      includesTests: true
    });
  });

  it('builds a coder prompt for file generation', async () => {
    const agentCalls = [];
    const file = intent(
      {
        id: 'generate-files-sample',
        meta: { title: 'Generate Files Sample' },
        what: { capability: 'sample', description: 'Sample runtime' },
        why: { problem: 'Need generation helper', value: 'Keep implement steps short' },
        scope: { includes: [], excludes: [] },
        runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
        constraints: [],
        outcomes: [],
        verification: { intent: [], outcome: [] },
        library: { kind: 'package' }
      },
      async (ctx) => {
        return ctx.step('implement', () =>
          ctx.generate.files({
            instructions: 'Generate the minimal files for this sample.',
            context: {
              plan: {
                usesNodeCli: true
              }
            },
            files: [
              { path: 'package.json', content: 'string' },
              { path: 'bin/sample.js', content: 'string' }
            ]
          })
        );
      }
    );

    const adapters = {
      workspace: {
        root() {
          return '/tmp/axiom-test';
        },
        async read() {
          return '';
        },
        async write() {},
        async patch() {}
      },
      artifacts: {
        async read() {
          return null;
        }
      },
      ai: {
        agent(name) {
          return {
            async run(input) {
              agentCalls.push({ name, input });
              return {
                files: [
                  { path: 'package.json', content: '{"name":"sample"}' },
                  { path: 'bin/sample.js', content: '#!/usr/bin/env node' }
                ]
              };
            }
          };
        }
      },
      workers: {
        worker() {
          return {
            async exec(spec) {
              return { ...spec, exitCode: 0 };
            }
          };
        }
      },
      checkpoint: {
        async approval() {
          return { accepted: true };
        },
        async choice() {
          return { value: null };
        },
        async input() {
          return { value: null };
        }
      }
    };

    const result = await runIntent(file, adapters);

    expect(result.status).toBe('passed');
    expect(agentCalls).toHaveLength(1);
    expect(agentCalls[0].name).toBe('coder');
    expect(agentCalls[0].input.prompt).toContain('Generate the minimal files for this sample.');
    expect(agentCalls[0].input.prompt).toContain('Return only valid JSON');
    expect(agentCalls[0].input.prompt).toContain('"package.json"');
    expect(agentCalls[0].input.prompt).toContain('"usesNodeCli": true');
    expect(result.finalValue).toEqual({
      files: [
        { path: 'package.json', content: '{"name":"sample"}' },
        { path: 'bin/sample.js', content: '#!/usr/bin/env node' }
      ]
    });
  });

  it('materializes generated files through the workspace adapter', async () => {
    const writes = [];
    const file = intent(
      {
        id: 'materialize-sample',
        meta: { title: 'Materialize Sample' },
        what: { capability: 'sample', description: 'Sample runtime' },
        why: { problem: 'Need smaller materialize steps', value: 'Reduce write boilerplate' },
        scope: { includes: [], excludes: [] },
        runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
        constraints: [],
        outcomes: [],
        verification: { intent: [], outcome: [] },
        library: { kind: 'package' }
      },
      async (ctx) => {
        await ctx.materialize.files([
          { path: 'package.json', content: '{"name":"sample"}' },
          { path: 'bin/sample.js', content: '#!/usr/bin/env node' }
        ]);

        return { ok: true };
      }
    );

    const adapters = {
      workspace: {
        root() {
          return '/tmp/axiom-test';
        },
        async read() {
          return '';
        },
        async write(filePath, content) {
          writes.push({ filePath, content });
        },
        async patch() {}
      },
      artifacts: {
        async read() {
          return null;
        }
      },
      ai: {
        agent() {
          return {
            async run(input) {
              return input;
            }
          };
        }
      },
      workers: {
        worker() {
          return {
            async exec(spec) {
              return { ...spec, exitCode: 0 };
            }
          };
        }
      },
      checkpoint: {
        async approval() {
          return { accepted: true };
        },
        async choice() {
          return { value: null };
        },
        async input() {
          return { value: null };
        }
      }
    };

    const result = await runIntent(file, adapters);

    expect(result.status).toBe('passed');
    expect(writes).toEqual([
      { filePath: 'package.json', content: '{"name":"sample"}' },
      { filePath: 'bin/sample.js', content: '#!/usr/bin/env node' }
    ]);
  });
});
