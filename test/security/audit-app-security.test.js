import { describe, expect, it } from 'vitest';
import { auditAppSecurity } from '../../src/security/audit-app-security.js';
import { normalizeSecurityPolicy } from '../../src/security/normalize-security-policy.js';

describe('auditAppSecurity', () => {
  it('passes generated files that stay within the browser basic profile', () => {
    const security = normalizeSecurityPolicy({
      app: {
        target: 'web-app',
        profile: 'browser-app-basic'
      }
    });

    const report = auditAppSecurity(security.app, [
      {
        path: 'src/app.js',
        content: 'window.localStorage.setItem("count", "1"); fetch("https://api.example.com/data");'
      }
    ]);

    expect(report).toEqual({
      staticChecks: {
        status: 'pass',
        findings: []
      },
      finalStatus: 'pass'
    });
  });

  it('finds forbidden browser cookies, filesystem imports, shell execution, and insecure fetches', () => {
    const security = normalizeSecurityPolicy({
      app: {
        target: 'web-app',
        profile: 'browser-app-basic'
      }
    });

    const report = auditAppSecurity(security.app, [
      {
        path: 'src/app.js',
        content: [
          'document.cookie = "token=abc";',
          'fetch("http://api.example.com/data");',
          'import fs from "node:fs";',
          'import { exec } from "node:child_process";'
        ].join('\n')
      }
    ]);

    expect(report.staticChecks.status).toBe('failed');
    expect(report.finalStatus).toBe('failed');
    expect(report.staticChecks.findings.map((finding) => finding.ruleId)).toEqual([
      'storage.cookies.denied',
      'network.insecure-http',
      'filesystem.none',
      'shell.none'
    ]);
  });
});
