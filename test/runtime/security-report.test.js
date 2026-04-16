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

  it('breaks the build when app security violations are found and violationAction is break', async () => {
    const file = secureWebIntent(
      {
        app: {
          target: 'web-app',
          profile: 'browser-app-basic',
          violationAction: 'break'
        }
      },
      async (ctx) => {
        await ctx.materialize.files([
          {
            path: 'src/app.js',
            content: 'document.cookie = "token=abc";'
          }
        ]);
        return { ok: true };
      }
    );

    const adapters = createTestAdapters({
      writtenFiles: []
    });
    adapters.workspace.write = async (path, content) => {
      adapters.writtenFiles.push({ path, content });
    };
    adapters.writtenFiles = [];

    const result = await runIntent(file, adapters);

    expect(result.status).toBe('failed');
    expect(result.securityReport.app.finalStatus).toBe('failed');
    expect(result.diagnostics[0].message).toBe('Application security policy failed.');
  });

  it('warns without failing when app security violations are found and violationAction is warn', async () => {
    const file = secureWebIntent(
      {
        app: {
          target: 'web-app',
          policy: {
            network: { allowed: ['https'], denied: [] },
            storage: { allowed: [], denied: ['cookies'] },
            secrets: 'none',
            filesystem: 'none'
          },
          violationAction: 'warn'
        }
      },
      async (ctx) => {
        await ctx.materialize.files([
          {
            path: 'src/app.js',
            content: 'document.cookie = "token=abc";'
          }
        ]);
        return { ok: true };
      }
    );

    const adapters = createTestAdapters();
    adapters.writtenFiles = [];
    adapters.workspace.write = async (path, content) => {
      adapters.writtenFiles.push({ path, content });
    };

    const result = await runIntent(file, adapters);

    expect(result.status).toBe('passed');
    expect(result.securityReport.app.finalStatus).toBe('warning');
  });
});
