import { describe, expect, it } from 'vitest';
import { intent, must, outcome, runIntent } from '../../src/index.js';
import { createTestAdapters } from '../../src/adapters/test-adapters.js';

function secureWebIntent(security, runFn = async () => ({ ok: true })) {
  return intent(
    {
      id: 'secure-web',
      meta: { title: 'Secure Web' },
      what: { capability: 'webapp', description: 'Secure browser app' },
      why: { problem: 'Need secure app', value: 'Audit generated output' },
      scope: { includes: [], excludes: [] },
      runtime: { languages: ['javascript'], targets: ['browser'], platforms: ['web'] },
      constraints: [must('must-exist', 'Constraint exists')],
      outcomes: [outcome('works', 'It works')],
      verification: { intent: [], outcome: [] },
      web: { kind: 'static' },
      security
    },
    runFn
  );
}

describe('runtime security report', () => {
  it('initializes a security report for source-declared security', async () => {
    const file = secureWebIntent({
      build: { mode: 'local' },
      app: {
        target: 'web-app',
        profile: 'browser-app-basic'
      }
    });

    const result = await runIntent(file, createTestAdapters());

    expect(result.status).toBe('passed');
    expect(result.securityReport.build).toEqual({
      mode: 'local',
      status: 'warning',
      warnings: ['Local build mode is not sandboxed beyond the assigned workspace boundary.']
    });
    expect(result.securityReport.app).toMatchObject({
      target: 'web-app',
      profile: 'browser-app-basic',
      finalStatus: 'pass'
    });
  });

  it('exposes normalized security policy on ctx.security', async () => {
    let capturedSecurity;
    const file = secureWebIntent(
      {
        build: { mode: 'docker', profile: 'node-webapp' },
        app: {
          target: 'web-app',
          profile: 'browser-app-basic'
        }
      },
      async (ctx) => {
        capturedSecurity = ctx.security;
        return { ok: true };
      }
    );

    await runIntent(file, createTestAdapters());

    expect(capturedSecurity.build.mode).toBe('docker');
    expect(capturedSecurity.app.policy.secrets).toBe('none');
  });
});
