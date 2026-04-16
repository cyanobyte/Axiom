import { describe, expect, it } from 'vitest';
import { runAiSecurityReview } from '../../src/security/run-ai-security-review.js';
import { normalizeSecurityPolicy } from '../../src/security/normalize-security-policy.js';

describe('runAiSecurityReview', () => {
  it('returns pass when no security-review agent is configured', async () => {
    const security = normalizeSecurityPolicy({
      app: {
        target: 'web-app',
        profile: 'browser-app-basic'
      }
    });

    const result = await runAiSecurityReview({
      adapters: { ai: { agent: () => { throw new Error('missing'); } } },
      appSecurity: security.app,
      files: []
    });

    expect(result).toEqual({
      status: 'not-run',
      findings: []
    });
  });

  it('normalizes structured AI review findings', async () => {
    const security = normalizeSecurityPolicy({
      app: {
        target: 'web-app',
        profile: 'browser-app-basic'
      }
    });

    const result = await runAiSecurityReview({
      adapters: {
        ai: {
          agent(name) {
            expect(name).toBe('security-reviewer');
            return {
              async run() {
                return {
                  findings: [
                    {
                      severity: 'warning',
                      message: 'Token storage should be reviewed.',
                      path: 'src/app.js'
                    }
                  ]
                };
              }
            };
          }
        }
      },
      appSecurity: security.app,
      files: [{ path: 'src/app.js', content: 'localStorage.setItem("token", token);' }]
    });

    expect(result).toEqual({
      status: 'warning',
      findings: [
        {
          severity: 'warning',
          message: 'Token storage should be reviewed.',
          path: 'src/app.js'
        }
      ]
    });
  });
});
