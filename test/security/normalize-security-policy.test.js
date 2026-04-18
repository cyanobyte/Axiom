import { describe, expect, it } from 'vitest';
import { normalizeSecurityPolicy } from '../../src/security/normalize-security-policy.js';

describe('normalizeSecurityPolicy', () => {
  it('normalizes local build security and official app profile defaults', () => {
    const policy = normalizeSecurityPolicy({
      build: { mode: 'local' },
      app: {
        target: 'web-app',
        profile: 'browser-app-basic'
      }
    });

    expect(policy).toEqual({
      build: {
        mode: 'local',
        isolation: 'workspace-only',
        warnings: [
          'Local build mode is not sandboxed beyond the assigned workspace boundary.'
        ]
      },
      app: {
        target: 'web-app',
        source: 'profile',
        profile: 'browser-app-basic',
        violationAction: 'break',
        policy: {
          network: { allowed: ['https'], denied: [] },
          storage: { allowed: ['localStorage'], denied: ['cookies'] },
          secrets: 'none',
          filesystem: 'none',
          shell: 'none'
        }
      }
    });
  });

  it('normalizes docker build security with an official profile', () => {
    const policy = normalizeSecurityPolicy({
      build: {
        mode: 'docker',
        profile: 'node-webapp'
      }
    });

    expect(policy.build).toMatchObject({
      mode: 'docker',
      profile: 'node-webapp',
      image: 'axiom-build-node-webapp:local',
      dockerfile: 'docker/runner/node-webapp/Dockerfile',
      network: 'restricted',
      env: { allow: ['PATH', 'HOME', 'NODE_ENV'] }
    });
  });

  it('normalizes opt-in live Codex docker build security', () => {
    const policy = normalizeSecurityPolicy({
      build: {
        mode: 'docker',
        profile: 'node-webapp-codex-live'
      }
    });

    expect(policy.build).toMatchObject({
      mode: 'docker',
      profile: 'node-webapp-codex-live',
      image: 'axiom-build-node-webapp:local',
      dockerfile: 'docker/runner/node-webapp/Dockerfile',
      network: 'bridge',
      env: { allow: ['PATH', 'NODE_ENV'] },
      tools: ['node', 'npm', 'codex'],
      credentialMounts: [
        {
          source: '~/.codex/auth.json',
          target: '/home/node/.codex/auth.json',
          readonly: true
        },
        {
          source: '~/.codex/config.toml',
          target: '/home/node/.codex/config.toml',
          readonly: true
        }
      ]
    });
  });

  it('normalizes virtualbox vm build security with an official profile', () => {
    const policy = normalizeSecurityPolicy({
      build: {
        mode: 'vm',
        provider: 'virtualbox',
        profile: 'node-webapp'
      }
    });

    expect(policy.build).toMatchObject({
      mode: 'vm',
      provider: 'virtualbox',
      profile: 'node-webapp',
      packerTemplate: 'profiles/node-webapp/virtualbox.pkr.hcl'
    });
  });

  it('rejects unsupported vm providers in the New MVP', () => {
    expect(() =>
      normalizeSecurityPolicy({
        build: {
          mode: 'vm',
          provider: 'aws',
          profile: 'node-webapp'
        }
      })
    ).toThrow(/Unsupported New MVP vm provider: aws/);
  });

  it('normalizes inline app policy with explicit warn action', () => {
    const policy = normalizeSecurityPolicy({
      app: {
        target: 'web-app',
        policy: {
          network: { allowed: ['https://api.example.com'], denied: ['*'] },
          storage: { allowed: ['localStorage'], denied: ['cookies'] },
          secrets: 'none',
          filesystem: 'none'
        },
        violationAction: 'warn'
      }
    });

    expect(policy.app).toEqual({
      target: 'web-app',
      source: 'policy',
      profile: undefined,
      violationAction: 'warn',
      policy: {
        network: { allowed: ['https://api.example.com'], denied: ['*'] },
        storage: { allowed: ['localStorage'], denied: ['cookies'] },
        secrets: 'none',
        filesystem: 'none',
        shell: 'none'
      }
    });
  });

  it('requires violationAction for custom profile files and inline policies', () => {
    expect(() =>
      normalizeSecurityPolicy({
        app: {
          target: 'web-app',
          policy: {
            network: { allowed: ['https'], denied: [] },
            storage: { allowed: [], denied: [] },
            secrets: 'none',
            filesystem: 'none'
          }
        }
      })
    ).toThrow(/security.app.violationAction is required for custom app policies/);
  });

  it('rejects ambiguous app policy sources', () => {
    expect(() =>
      normalizeSecurityPolicy({
        app: {
          target: 'web-app',
          profileFile: './security/app.json',
          policy: {
            network: { allowed: ['https'], denied: [] },
            storage: { allowed: [], denied: [] },
            secrets: 'none',
            filesystem: 'none'
          },
          violationAction: 'break'
        }
      })
    ).toThrow(/Choose exactly one app security policy source/);
  });
});
