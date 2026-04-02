import { describe, expect, it } from 'vitest';
import { loadIntentFile, runIntent } from '../../src/index.js';

function createExampleAdapters() {
  const writes = [];

  return {
    workspace: {
      root() {
        return '/tmp/counter-webapp';
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
      async read(path) {
        if (path === 'reports/counter-ui.json') {
          return {
            loads: true,
            increments: true,
            resets: true,
            apiReturnsJsonCount: true
          };
        }
        return null;
      }
    },
    ai: {
      agent(name) {
        return {
          async run(input) {
            if (name === 'briefing') {
              return {
                kind: 'brief',
                summary: input.intent.meta.summary
              };
            }

            if (name === 'planner') {
              expect(typeof input.prompt).toBe('string');
              expect(input.prompt).toContain('Return only valid JSON');
              return {
                includesLoadCounter: true,
                includesIncrementCounter: true,
                includesResetCounter: true,
                usesExpress: true,
                usesInMemoryState: true,
                returnsJsonCount: true,
                servesSinglePage: true
              };
            }

            if (name === 'coder') {
              expect(typeof input.prompt).toBe('string');
              expect(input.prompt).toContain('Return only valid JSON');
              return {
                files: [
                  {
                    path: 'app/index.html',
                    content: '<h1>Counter</h1>'
                  },
                  {
                    path: 'package.json',
                    content: '{"name":"counter-webapp"}'
                  }
                ]
              };
            }

            throw new Error(`Unexpected agent: ${name}`);
          }
        };
      }
    },
    workers: {
      worker(name) {
        return {
          async exec(spec) {
            return {
              worker: name,
              ...spec,
              exitCode: 0
            };
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
    },
    writes
  };
}

describe('basic counter webapp example', () => {
  it('runs end to end with deterministic adapters', async () => {
    const file = await loadIntentFile('examples/basic/counter-webapp.axiom.js');
    const adapters = createExampleAdapters();
    const result = await runIntent(file, adapters);

    expect(result.status).toBe('passed');
    expect(result.stepResults.map((step) => step.stepId)).toEqual([
      'brief',
      'plan',
      'implement',
      'test'
    ]);
    expect(result.verification.map((item) => item.verificationId)).toEqual([
      'plan-covers-counter-flow',
      'counter-ui-flow',
      'counter-api-json',
      'counter-report-exists'
    ]);
    expect(result.verification.every((item) => item.status === 'passed')).toBe(true);
    expect(result.finalValue).toEqual({
      ok: true,
      app: 'counter-webapp',
      verifiedOutcomes: {
        total: 4,
        passed: 4,
        failed: 0
      }
    });
    expect(adapters.writes).toEqual([
      {
        filePath: 'app/index.html',
        content: '<h1>Counter</h1>'
      },
      {
        filePath: 'package.json',
        content: '{"name":"counter-webapp"}'
      }
    ]);
  });
});
