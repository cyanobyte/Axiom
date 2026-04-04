import { describe, expect, it } from 'vitest';
import { loadIntentFile, runIntent } from '../../src/index.js';

function createDogfoodAdapters() {
  const writes = [];

  return {
    workspace: {
      root() {
        return '/tmp/axiom-runtime-slice';
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
        if (path === 'reports/runtime-slice.json') {
          return {
            exportsCreateHealthSummary: true,
            includesHealthStatus: true
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
                definesHealthSummaryHelper: true,
                exportsNamedHelper: true,
                includesFocusedTest: true
              };
            }

            if (name === 'coder') {
              expect(typeof input.prompt).toBe('string');
              expect(input.prompt).toContain('Return only valid JSON');
              return {
                files: [
                  {
                    path: 'src/create-runtime-slice-summary.js',
                    content: 'export function createRuntimeSliceSummary() { return { status: "ok" }; }'
                  },
                  {
                    path: 'test/create-runtime-slice-summary.test.js',
                    content: 'console.log("test")'
                  },
                  {
                    path: 'package.json',
                    content: '{"name":"axiom-runtime-slice","scripts":{"test":"npm test"}}'
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

describe('dogfood runtime slice example', () => {
  it('runs in an isolated workspace with deterministic adapters', async () => {
    const file = await loadIntentFile('examples/dogfood/axiom-runtime-slice.axiom.js');
    const adapters = createDogfoodAdapters();
    const result = await runIntent(file, adapters);

    expect(result.status).toBe('passed');
    expect(result.stepResults.map((step) => step.stepId)).toEqual([
      'brief',
      'plan',
      'implement',
      'test'
    ]);
    expect(result.finalValue).toEqual({
      ok: true,
      app: 'axiom-runtime-slice',
      verifiedOutcomes: {
        total: 2,
        passed: 2,
        failed: 0
      }
    });
    expect(adapters.writes).toEqual([
      {
        filePath: 'src/create-runtime-slice-summary.js',
        content: 'export function createRuntimeSliceSummary() { return { status: "ok" }; }'
      },
      {
        filePath: 'test/create-runtime-slice-summary.test.js',
        content: 'console.log("test")'
      },
      {
        filePath: 'package.json',
        content: '{"name":"axiom-runtime-slice","scripts":{"test":"npm test"}}'
      }
    ]);
  });
});
