import { describe, expect, it } from 'vitest';
import { loadIntentFile, runIntent } from '../../src/index.js';

function createLiveExampleAdapters() {
  return {
    workspace: {
      root() {
        return '/tmp/live-counter-webapp';
      },
      async read() {
        return '';
      },
      async write() {},
      async patch() {}
    },
    artifacts: {
      async read(path) {
        if (path === 'reports/counter-ui.json') {
          return {
            loads: true,
            increments: true,
            resets: true
          };
        }

        return null;
      }
    },
    ai: {
      agent(name) {
        if (name === 'briefing') {
          throw new Error('live example should not call a briefing agent');
        }

        return {
          async run(input) {
            if (name === 'planner') {
              expect(typeof input.prompt).toBe('string');
              expect(input.prompt).toContain('Return only valid JSON');
              return {
                includesLoadCounter: true,
                includesIncrementCounter: true,
                includesResetCounter: true,
                usesExpress: true,
                returnsJsonCount: true
              };
            }

            if (name === 'coder') {
              expect(typeof input.prompt).toBe('string');
              expect(input.prompt).toContain('Return only valid JSON');
              expect(input.prompt).toContain('verify-counter.js');
              expect(input.prompt).toContain('start the generated server');
              expect(input.prompt).toContain('exercise the real HTTP counter flow');
              return {
                files: [
                  { path: 'package.json', content: '{"name":"counter-live"}' },
                  { path: 'server.js', content: 'console.log("server")' },
                  { path: 'scripts/verify-counter.js', content: 'console.log("verify")' }
                ]
              };
            }

            throw new Error(`Unexpected agent: ${name}`);
          }
        };
      }
    },
    workers: {
      worker() {
        return {
          async exec(spec) {
            return {
              ...spec,
              stdout: '',
              stderr: '',
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
    }
  };
}

describe('live counter webapp example', () => {
  it('runs without a briefing agent', async () => {
    const file = await loadIntentFile('examples/live-counter/counter-webapp.axiom.js');
    const result = await runIntent(file, createLiveExampleAdapters());

    expect(result.status).toBe('passed');
    expect(result.stepResults.map((step) => step.stepId)).toEqual([
      'brief',
      'plan',
      'implement',
      'install',
      'test'
    ]);
    expect(result.finalValue.app).toBe('counter-webapp-live');
  });
});
