# New MVP Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add source-declared `security` policy to Axiom so builds can declare AI/build isolation and generated applications can be audited against app security profiles.

**Architecture:** Add a focused security module that validates and normalizes `.axiom.js` `security` declarations into stable build and app policy objects. Runtime execution consumes the normalized policy to produce security reports, warn on local build mode, and fail or warn based on app security findings. Docker and VM modes are profile-validated in this plan; full container/VM command execution is reserved for follow-up plans after the policy surface and reports are stable.

**Tech Stack:** Node.js ESM, Vitest, existing Axiom intent validation/runtime/adapters, deterministic fake adapters for tests

---

## File Structure

- Create `src/security/build-profiles.js`: official build profile registry shared by Docker and VM build policies.
- Create `src/security/app-profiles.js`: official app profile registry for `web-app`, `desktop-app`, and `phone-app`.
- Create `src/security/normalize-security-policy.js`: validates source declarations and returns normalized build/app policy.
- Create `src/security/audit-app-security.js`: deterministic static app audit against generated files and normalized app policy.
- Create `src/security/create-security-report.js`: creates the initial and final security report shape.
- Modify `src/definition/recognized-sections.js`: recognize top-level `security`.
- Modify `src/definition/validate-definition.js`: call security normalization during intent validation.
- Modify `src/runtime/result-model.js`: add `securityReport`.
- Modify `src/runtime/run-intent.js`: initialize security report, add local-mode warning, run app audit after workflow execution, and apply `violationAction`.
- Modify `src/runtime/create-run-context.js`: expose `ctx.security` for generated workflows and AI prompt context.
- Modify `src/index.js`: export the new security helpers needed by tests and future CLI use.
- Test `test/security/normalize-security-policy.test.js`: validation and normalization coverage.
- Test `test/security/audit-app-security.test.js`: deterministic app audit coverage.
- Test `test/runtime/security-report.test.js`: runtime reporting and break/warn behavior.
- Test `test/definition/validate-definition.test.js`: top-level schema acceptance and rejection.

## Task 1: Recognize And Normalize Security Policy

**Files:**
- Create: `src/security/build-profiles.js`
- Create: `src/security/app-profiles.js`
- Create: `src/security/normalize-security-policy.js`
- Modify: `src/definition/recognized-sections.js`
- Modify: `src/definition/validate-definition.js`
- Modify: `src/index.js`
- Test: `test/security/normalize-security-policy.test.js`
- Test: `test/definition/validate-definition.test.js`

- [x] **Step 1: Write failing normalization tests**

Create `test/security/normalize-security-policy.test.js`:

```js
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
      image: 'ghcr.io/science451/axiom-build-node-webapp:latest',
      network: 'restricted',
      env: { allow: ['PATH', 'HOME', 'NODE_ENV'] }
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
```

- [x] **Step 2: Add definition validation tests**

Append these tests to `test/definition/validate-definition.test.js`:

```js
  it('accepts a top-level security section', () => {
    const file = intent(
      {
        id: 'secure-web-app',
        meta: { title: 'Secure Web App' },
        what: { capability: 'webapp', description: 'Secure browser app' },
        why: { problem: 'Need secure app', value: 'Audit generated output' },
        scope: { includes: [], excludes: [] },
        runtime: { languages: ['javascript'], targets: ['browser'], platforms: ['web'] },
        constraints: [must('must-exist', 'Constraint exists')],
        outcomes: [outcome('works', 'It works')],
        verification: { intent: [], outcome: [] },
        web: { kind: 'static' },
        security: {
          build: { mode: 'local' },
          app: {
            target: 'web-app',
            profile: 'browser-app-basic'
          }
        }
      },
      async () => ({ ok: true })
    );

    expect(file.definition.security.app.violationAction).toBe('break');
    expect(file.definition.security.build.mode).toBe('local');
  });

  it('rejects invalid security declarations during intent validation', () => {
    expect(() =>
      intent(
        {
          id: 'bad-security',
          meta: { title: 'Bad Security' },
          what: { capability: 'webapp', description: 'Bad security app' },
          why: { problem: 'Need secure app', value: 'Audit generated output' },
          scope: { includes: [], excludes: [] },
          runtime: { languages: ['javascript'], targets: ['browser'], platforms: ['web'] },
          constraints: [must('must-exist', 'Constraint exists')],
          outcomes: [outcome('works', 'It works')],
          verification: { intent: [], outcome: [] },
          web: { kind: 'static' },
          security: {
            build: { mode: 'vm', provider: 'aws', profile: 'node-webapp' }
          }
        },
        async () => ({ ok: true })
      )
    ).toThrow(/Unsupported New MVP vm provider: aws/);
  });
```

- [x] **Step 3: Run tests to verify failure**

Run:

```bash
npm test -- test/security/normalize-security-policy.test.js test/definition/validate-definition.test.js
```

Expected: FAIL because `src/security/normalize-security-policy.js` does not exist and `security` is not a recognized top-level section.

- [x] **Step 4: Add official build profiles**

Create `src/security/build-profiles.js`:

```js
export const BUILD_PROFILES = {
  'node-webapp': {
    docker: {
      image: 'ghcr.io/science451/axiom-build-node-webapp:latest',
      network: 'restricted',
      env: { allow: ['PATH', 'HOME', 'NODE_ENV'] },
      resources: { cpu: 2, memory: '4g' },
      tools: ['node', 'npm']
    },
    vm: {
      virtualbox: {
        packerTemplate: 'profiles/node-webapp/virtualbox.pkr.hcl',
        network: 'restricted',
        env: { allow: ['PATH', 'HOME', 'NODE_ENV'] },
        resources: { cpu: 2, memory: '4g' },
        tools: ['node', 'npm']
      }
    }
  }
};

export function getBuildProfile(profileName) {
  return BUILD_PROFILES[profileName];
}
```

- [x] **Step 5: Add official app profiles**

Create `src/security/app-profiles.js`:

```js
export const APP_PROFILES = {
  'browser-app-basic': {
    target: 'web-app',
    policy: {
      network: { allowed: ['https'], denied: [] },
      storage: { allowed: ['localStorage'], denied: ['cookies'] },
      secrets: 'none',
      filesystem: 'none',
      shell: 'none'
    }
  },
  'desktop-local-files': {
    target: 'desktop-app',
    policy: {
      network: { allowed: ['https'], denied: [] },
      storage: { allowed: ['appData'], denied: [] },
      secrets: 'os-keychain',
      filesystem: 'user-selected-files',
      shell: 'none'
    }
  },
  'phone-app-basic': {
    target: 'phone-app',
    policy: {
      network: { allowed: ['https'], denied: [] },
      storage: { allowed: ['appStorage'], denied: [] },
      secrets: 'secure-storage',
      filesystem: 'app-sandbox',
      shell: 'none'
    }
  }
};

export function getAppProfile(profileName) {
  return APP_PROFILES[profileName];
}
```

- [x] **Step 6: Implement security normalization**

Create `src/security/normalize-security-policy.js`:

```js
import { getAppProfile } from './app-profiles.js';
import { getBuildProfile } from './build-profiles.js';

const SUPPORTED_BUILD_MODES = new Set(['local', 'docker', 'vm']);
const SUPPORTED_APP_TARGETS = new Set(['web-app', 'desktop-app', 'phone-app']);
const SUPPORTED_VIOLATION_ACTIONS = new Set(['break', 'warn']);

export function normalizeSecurityPolicy(security = {}) {
  return {
    ...(security.build ? { build: normalizeBuildSecurity(security.build) } : {}),
    ...(security.app ? { app: normalizeAppSecurity(security.app) } : {})
  };
}

function normalizeBuildSecurity(build) {
  if (!SUPPORTED_BUILD_MODES.has(build?.mode)) {
    throw new Error(`Unsupported security.build.mode: ${build?.mode}`);
  }

  if (build.mode === 'local') {
    return {
      mode: 'local',
      isolation: 'workspace-only',
      warnings: ['Local build mode is not sandboxed beyond the assigned workspace boundary.']
    };
  }

  if (!build.profile) {
    throw new Error(`security.build.profile is required for ${build.mode} mode`);
  }

  const profile = getBuildProfile(build.profile);
  if (!profile) {
    throw new Error(`Unknown security.build.profile: ${build.profile}`);
  }

  if (build.mode === 'docker') {
    if (!profile.docker) {
      throw new Error(`Build profile ${build.profile} does not support docker mode`);
    }

    return {
      mode: 'docker',
      profile: build.profile,
      ...structuredClone(profile.docker)
    };
  }

  if (build.provider !== 'virtualbox') {
    throw new Error(`Unsupported New MVP vm provider: ${build.provider}`);
  }

  const vmProfile = profile.vm?.[build.provider];
  if (!vmProfile) {
    throw new Error(`Build profile ${build.profile} does not support vm provider ${build.provider}`);
  }

  return {
    mode: 'vm',
    provider: build.provider,
    profile: build.profile,
    ...structuredClone(vmProfile)
  };
}

function normalizeAppSecurity(app) {
  if (!SUPPORTED_APP_TARGETS.has(app?.target)) {
    throw new Error(`Unsupported security.app.target: ${app?.target}`);
  }

  const sources = ['profile', 'profileFile', 'policy'].filter((key) => app[key] !== undefined);
  if (sources.length !== 1) {
    throw new Error('Choose exactly one app security policy source');
  }

  if (!SUPPORTED_VIOLATION_ACTIONS.has(app.violationAction ?? 'break')) {
    throw new Error(`Unsupported security.app.violationAction: ${app.violationAction}`);
  }

  if ((app.profileFile || app.policy) && !app.violationAction) {
    throw new Error('security.app.violationAction is required for custom app policies');
  }

  if (app.profile) {
    const profile = getAppProfile(app.profile);
    if (!profile) {
      throw new Error(`Unknown security.app.profile: ${app.profile}`);
    }
    if (profile.target !== app.target) {
      throw new Error(`security.app.profile ${app.profile} targets ${profile.target}, not ${app.target}`);
    }

    return {
      target: app.target,
      source: 'profile',
      profile: app.profile,
      violationAction: app.violationAction ?? 'break',
      policy: mergePolicy(profile.policy, app.overrides)
    };
  }

  if (app.profileFile) {
    return {
      target: app.target,
      source: 'profileFile',
      profileFile: app.profileFile,
      violationAction: app.violationAction,
      policy: normalizePolicy(app.loadedPolicy ?? {})
    };
  }

  return {
    target: app.target,
    source: 'policy',
    profile: undefined,
    violationAction: app.violationAction,
    policy: normalizePolicy(app.policy)
  };
}

function mergePolicy(basePolicy, overrides) {
  return normalizePolicy({
    ...structuredClone(basePolicy),
    ...structuredClone(overrides ?? {})
  });
}

function normalizePolicy(policy = {}) {
  return {
    network: normalizeAccessList(policy.network),
    storage: normalizeAccessList(policy.storage),
    secrets: policy.secrets ?? 'none',
    filesystem: policy.filesystem ?? 'none',
    shell: policy.shell ?? 'none'
  };
}

function normalizeAccessList(value = {}) {
  return {
    allowed: Array.isArray(value.allowed) ? value.allowed : [],
    denied: Array.isArray(value.denied) ? value.denied : []
  };
}
```

- [x] **Step 7: Recognize the top-level security section**

Modify `src/definition/recognized-sections.js` so `OPTIONAL_SECTIONS` includes `security`:

```js
export const OPTIONAL_SECTIONS = [
  'build',
  'references',
  'assumptions',
  'architecture',
  'policies',
  'quality_attributes',
  'web',
  'cli',
  'service',
  'library',
  'desktop',
  'mobile',
  'model',
  'security'
];
```

Keep the existing section names from the file; add `security` as an optional top-level section.

- [x] **Step 8: Normalize security during definition validation**

Modify `src/definition/validate-definition.js`:

```js
import { normalizeSecurityPolicy } from '../security/normalize-security-policy.js';
```

Then insert this block after unknown top-level section validation and before domain-section validation:

```js
  if (normalized.security) {
    normalized.security = normalizeSecurityPolicy(normalized.security);
  }
```

- [x] **Step 9: Export the normalizer**

Modify `src/index.js`:

```js
export { normalizeSecurityPolicy } from './security/normalize-security-policy.js';
```

- [x] **Step 10: Run focused tests**

Run:

```bash
npm test -- test/security/normalize-security-policy.test.js test/definition/validate-definition.test.js
```

Expected: PASS.

- [x] **Step 11: Commit**

```bash
git add src/security/build-profiles.js src/security/app-profiles.js src/security/normalize-security-policy.js src/definition/recognized-sections.js src/definition/validate-definition.js src/index.js test/security/normalize-security-policy.test.js test/definition/validate-definition.test.js
git commit -m "feat: add security policy normalization"
```

## Task 2: Add Security Report To Runtime Results

**Files:**
- Create: `src/security/create-security-report.js`
- Modify: `src/runtime/result-model.js`
- Modify: `src/runtime/run-intent.js`
- Modify: `src/runtime/create-run-context.js`
- Modify: `src/index.js`
- Test: `test/runtime/security-report.test.js`

- [x] **Step 1: Write failing runtime report tests**

Create `test/runtime/security-report.test.js`:

```js
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
```

- [x] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/runtime/security-report.test.js
```

Expected: FAIL because `securityReport` and `ctx.security` are not implemented.

- [x] **Step 3: Create security report helpers**

Create `src/security/create-security-report.js`:

```js
export function createSecurityReport(security) {
  if (!security) {
    return undefined;
  }

  return {
    ...(security.build ? { build: createBuildReport(security.build) } : {}),
    ...(security.app ? { app: createAppReport(security.app) } : {})
  };
}

function createBuildReport(build) {
  return {
    mode: build.mode,
    ...(build.profile ? { profile: build.profile } : {}),
    ...(build.provider ? { provider: build.provider } : {}),
    status: build.warnings?.length > 0 ? 'warning' : 'pass',
    warnings: build.warnings ?? []
  };
}

function createAppReport(app) {
  return {
    target: app.target,
    ...(app.profile ? { profile: app.profile } : {}),
    source: app.source,
    staticChecks: {
      status: 'not-run',
      findings: []
    },
    aiReview: {
      status: 'not-run',
      findings: []
    },
    finalStatus: 'not-run'
  };
}
```

- [x] **Step 4: Add securityReport to result model**

Modify `src/runtime/result-model.js`:

```js
export function createRunResult(definition) {
  return {
    status: 'passed',
    stepResults: [],
    events: [],
    verification: [],
    diagnostics: [],
    artifacts: [],
    securityReport: createSecurityReport(definition?.security),
    finalValue: undefined,
    pendingCheckpoint: undefined,
    intentRevision: undefined
  };
}
```

Add the import at the top:

```js
import { createSecurityReport } from '../security/create-security-report.js';
```

- [x] **Step 5: Pass the definition to createRunResult**

Modify `src/runtime/run-intent.js`:

```js
  const result = createRunResult(file.definition);
```

- [x] **Step 6: Expose security on runtime context**

Modify the object returned by `createRunContext` in `src/runtime/create-run-context.js`:

```js
    security: file.definition.security,
```

Place it near `intent: file.definition`.

- [x] **Step 7: Export report helper**

Modify `src/index.js`:

```js
export { createSecurityReport } from './security/create-security-report.js';
```

- [x] **Step 8: Run focused tests**

Run:

```bash
npm test -- test/runtime/security-report.test.js
```

Expected: PASS.

- [x] **Step 9: Run existing runtime tests**

Run:

```bash
npm test -- test/runtime/run-intent.test.js test/runtime/result-model.test.js
```

Expected: PASS. If `test/runtime/result-model.test.js` does not exist, run only `test/runtime/run-intent.test.js`.

- [x] **Step 10: Commit**

```bash
git add src/security/create-security-report.js src/runtime/result-model.js src/runtime/run-intent.js src/runtime/create-run-context.js src/index.js test/runtime/security-report.test.js
git commit -m "feat: add runtime security report"
```

## Task 3: Add Deterministic App Security Audit

**Files:**
- Create: `src/security/audit-app-security.js`
- Modify: `src/runtime/run-intent.js`
- Modify: `src/index.js`
- Test: `test/security/audit-app-security.test.js`
- Test: `test/runtime/security-report.test.js`

- [x] **Step 1: Write failing app audit tests**

Create `test/security/audit-app-security.test.js`:

```js
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
```

- [x] **Step 2: Extend runtime security tests for break/warn**

Append these tests to `test/runtime/security-report.test.js`:

```js
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
```

- [x] **Step 3: Run tests to verify failure**

Run:

```bash
npm test -- test/security/audit-app-security.test.js test/runtime/security-report.test.js
```

Expected: FAIL because `auditAppSecurity` is not implemented and runtime does not audit materialized files.

- [x] **Step 4: Implement deterministic app audit**

Create `src/security/audit-app-security.js`:

```js
export function auditAppSecurity(appSecurity, files = []) {
  const findings = [];

  for (const file of files) {
    const content = String(file.content ?? '');
    findings.push(...auditStorage(appSecurity, file.path, content));
    findings.push(...auditNetwork(appSecurity, file.path, content));
    findings.push(...auditFilesystem(appSecurity, file.path, content));
    findings.push(...auditShell(appSecurity, file.path, content));
  }

  return {
    staticChecks: {
      status: findings.length > 0 ? 'failed' : 'pass',
      findings
    },
    finalStatus: findings.length > 0 ? 'failed' : 'pass'
  };
}

function auditStorage(appSecurity, path, content) {
  if (!appSecurity.policy.storage.denied.includes('cookies')) {
    return [];
  }

  if (!/document\.cookie|CookieStore/.test(content)) {
    return [];
  }

  return [
    {
      ruleId: 'storage.cookies.denied',
      severity: 'error',
      path,
      message: 'Cookie storage is denied by the application security policy.'
    }
  ];
}

function auditNetwork(_appSecurity, path, content) {
  if (!/fetch\(["']http:\/\//.test(content)) {
    return [];
  }

  return [
    {
      ruleId: 'network.insecure-http',
      severity: 'error',
      path,
      message: 'Insecure http network access is not allowed.'
    }
  ];
}

function auditFilesystem(appSecurity, path, content) {
  if (appSecurity.policy.filesystem !== 'none') {
    return [];
  }

  if (!/from ["'](?:node:)?fs["']|require\(["'](?:node:)?fs["']\)/.test(content)) {
    return [];
  }

  return [
    {
      ruleId: 'filesystem.none',
      severity: 'error',
      path,
      message: 'Filesystem access is denied by the application security policy.'
    }
  ];
}

function auditShell(appSecurity, path, content) {
  if (appSecurity.policy.shell !== 'none') {
    return [];
  }

  if (!/from ["'](?:node:)?child_process["']|require\(["'](?:node:)?child_process["']\)/.test(content)) {
    return [];
  }

  return [
    {
      ruleId: 'shell.none',
      severity: 'error',
      path,
      message: 'Shell execution is denied by the application security policy.'
    }
  ];
}
```

- [x] **Step 5: Track materialized files in runtime state**

Modify `src/runtime/run-intent.js` state creation:

```js
  const state = {
    stepResults: result.stepResults,
    stepMap: new Map(),
    currentStepId: undefined,
    events,
    signal: options.signal,
    materializedFiles: []
  };
```

Modify `ctx.materialize.files` in `src/runtime/create-run-context.js`:

```js
      async files(files) {
        const materialized = await materializeFiles(adapters.workspace, files);
        state.materializedFiles.push(...files);
        return materialized;
      }
```

- [x] **Step 6: Run app audit after successful workflow execution**

Modify `src/runtime/run-intent.js`:

```js
import { auditAppSecurity } from '../security/audit-app-security.js';
```

After `result.finalValue = await file.runFn(ctx);`, add:

```js
    applyAppSecurityAudit(file.definition.security?.app, result, state.materializedFiles);
```

Add this helper to the bottom of `src/runtime/run-intent.js`:

```js
function applyAppSecurityAudit(appSecurity, result, files) {
  if (!appSecurity || !result.securityReport?.app) {
    return;
  }

  const audit = auditAppSecurity(appSecurity, files);
  result.securityReport.app.staticChecks = audit.staticChecks;
  result.securityReport.app.aiReview = {
    status: 'not-run',
    findings: []
  };

  if (audit.finalStatus === 'failed' && appSecurity.violationAction === 'warn') {
    result.securityReport.app.finalStatus = 'warning';
    result.diagnostics.push({
      kind: 'security',
      message: 'Application security policy produced warnings.',
      nextAction: 'Review securityReport.app.staticChecks.findings before release.'
    });
    return;
  }

  result.securityReport.app.finalStatus = audit.finalStatus;

  if (audit.finalStatus === 'failed') {
    result.status = 'failed';
    result.diagnostics.push({
      kind: 'security',
      message: 'Application security policy failed.',
      nextAction: 'Fix generated code or adjust the declared security.app policy.'
    });
  }
}
```

- [x] **Step 7: Export audit helper**

Modify `src/index.js`:

```js
export { auditAppSecurity } from './security/audit-app-security.js';
```

- [x] **Step 8: Run focused tests**

Run:

```bash
npm test -- test/security/audit-app-security.test.js test/runtime/security-report.test.js
```

Expected: PASS.

- [x] **Step 9: Commit**

```bash
git add src/security/audit-app-security.js src/runtime/run-intent.js src/runtime/create-run-context.js src/index.js test/security/audit-app-security.test.js test/runtime/security-report.test.js
git commit -m "feat: audit app security policy"
```

## Task 4: Add AI Security Review Hook

**Files:**
- Create: `src/security/run-ai-security-review.js`
- Modify: `src/runtime/run-intent.js`
- Modify: `src/adapters/test-adapters.js`
- Modify: `src/index.js`
- Test: `test/security/run-ai-security-review.test.js`
- Test: `test/runtime/security-report.test.js`

- [x] **Step 1: Write failing AI review tests**

Create `test/security/run-ai-security-review.test.js`:

```js
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
```

- [x] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/security/run-ai-security-review.test.js
```

Expected: FAIL because `runAiSecurityReview` does not exist.

- [x] **Step 3: Implement AI review helper**

Create `src/security/run-ai-security-review.js`:

```js
export async function runAiSecurityReview({ adapters, appSecurity, files }) {
  let reviewer;
  try {
    reviewer = adapters.ai.agent('security-reviewer');
  } catch {
    return {
      status: 'not-run',
      findings: []
    };
  }

  const output = await reviewer.run({
    task: 'Review generated application files against the declared Axiom security.app policy.',
    appSecurity,
    files: files.map((file) => ({
      path: file.path,
      content: String(file.content ?? '')
    })),
    expectedShape: {
      findings: [
        {
          severity: 'error|warning|info',
          message: 'string',
          path: 'string'
        }
      ]
    }
  });

  const findings = Array.isArray(output?.findings) ? output.findings.map(normalizeFinding) : [];
  return {
    status: deriveStatus(findings),
    findings
  };
}

function normalizeFinding(finding) {
  return {
    severity: ['error', 'warning', 'info'].includes(finding.severity) ? finding.severity : 'warning',
    message: String(finding.message ?? 'Security reviewer returned an empty finding.'),
    path: finding.path ? String(finding.path) : undefined
  };
}

function deriveStatus(findings) {
  if (findings.some((finding) => finding.severity === 'error')) {
    return 'failed';
  }
  if (findings.length > 0) {
    return 'warning';
  }
  return 'pass';
}
```

- [x] **Step 4: Run AI review from runtime app audit**

Modify `src/runtime/run-intent.js`:

```js
import { runAiSecurityReview } from '../security/run-ai-security-review.js';
```

Change the call after `result.finalValue = await file.runFn(ctx);` to:

```js
    await applyAppSecurityAudit(file.definition.security?.app, result, state.materializedFiles, adapters);
```

Change the helper signature and body:

```js
async function applyAppSecurityAudit(appSecurity, result, files, adapters) {
  if (!appSecurity || !result.securityReport?.app) {
    return;
  }

  const audit = auditAppSecurity(appSecurity, files);
  const aiReview = await runAiSecurityReview({ adapters, appSecurity, files });

  result.securityReport.app.staticChecks = audit.staticChecks;
  result.securityReport.app.aiReview = aiReview;

  const failed = audit.finalStatus === 'failed' || aiReview.status === 'failed';
  const warned = aiReview.status === 'warning';

  if ((failed || warned) && appSecurity.violationAction === 'warn') {
    result.securityReport.app.finalStatus = failed ? 'warning' : 'warning';
    result.diagnostics.push({
      kind: 'security',
      message: 'Application security policy produced warnings.',
      nextAction: 'Review securityReport.app findings before release.'
    });
    return;
  }

  result.securityReport.app.finalStatus = failed ? 'failed' : warned ? 'warning' : 'pass';

  if (failed) {
    result.status = 'failed';
    result.diagnostics.push({
      kind: 'security',
      message: 'Application security policy failed.',
      nextAction: 'Fix generated code or adjust the declared security.app policy.'
    });
  }
}
```

- [x] **Step 5: Export AI review helper**

Modify `src/index.js`:

```js
export { runAiSecurityReview } from './security/run-ai-security-review.js';
```

- [x] **Step 6: Run focused tests**

Run:

```bash
npm test -- test/security/run-ai-security-review.test.js test/runtime/security-report.test.js
```

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add src/security/run-ai-security-review.js src/runtime/run-intent.js src/index.js test/security/run-ai-security-review.test.js test/runtime/security-report.test.js
git commit -m "feat: add ai security review hook"
```

## Task 5: Document New MVP Security Usage

**Files:**
- Modify: `README.md`
- Modify: `docs/authoring-intents.md`
- Modify: `docs/runtime-config.md`
- Modify: `examples/basic/counter-webapp.axiom.js`
- Test: `test/examples/examples-load.test.js`

- [x] **Step 1: Add security block to the basic example**

Modify `examples/basic/counter-webapp.axiom.js` so its definition includes:

```js
security: {
  build: {
    mode: 'local'
  },
  app: {
    target: 'web-app',
    profile: 'browser-app-basic',
    violationAction: 'warn'
  }
}
```

Use `warn` for the example so beginner local builds demonstrate reporting without blocking adoption.

- [x] **Step 2: Add README security quickstart**

Add this section to `README.md` after the CLI examples:

```md
## Security Policy

Axiom intent files can declare source-controlled security policy:

```js
security: {
  build: {
    mode: "docker",
    profile: "node-webapp"
  },
  app: {
    target: "web-app",
    profile: "browser-app-basic",
    violationAction: "break"
  }
}
```

`security.build` controls where AI/build work runs. New MVP supports `local`, `docker`, and `vm`; VM execution supports `provider: "virtualbox"` first.

`security.app` controls what the generated application is allowed to do. Axiom runs static checks and an AI security review, then writes findings into the build security report.
```

- [x] **Step 3: Document authoring details**

Add a `## Security` section to `docs/authoring-intents.md` with the source shapes for:

```js
security: {
  build: { mode: "local" }
}
```

```js
security: {
  build: { mode: "docker", profile: "node-webapp" }
}
```

```js
security: {
  build: { mode: "vm", provider: "virtualbox", profile: "node-webapp" }
}
```

```js
security: {
  app: {
    target: "web-app",
    profile: "browser-app-basic",
    violationAction: "break"
  }
}
```

Explain that `profileFile`, inline `policy`, and `overrides` are accepted app policy sources, and that `profileFile` plus `policy` is invalid.

- [x] **Step 4: Document runtime config expectations**

Add a note to `docs/runtime-config.md`:

```md
Security policy is declared in `.axiom.js`, not runtime config. Runtime config still provides concrete adapters and credentials. New MVP Docker and VM security modes validate official profiles in source; full Docker/VM execution adapter wiring is a follow-up implementation layer.
```

- [x] **Step 5: Run example load tests**

Run:

```bash
npm test -- test/examples/examples-load.test.js
```

Expected: PASS.

- [x] **Step 6: Run security tests**

Run:

```bash
npm test -- test/security/normalize-security-policy.test.js test/security/audit-app-security.test.js test/security/run-ai-security-review.test.js test/runtime/security-report.test.js
```

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add README.md docs/authoring-intents.md docs/runtime-config.md examples/basic/counter-webapp.axiom.js test/examples/examples-load.test.js
git commit -m "docs: document new mvp security policy"
```

## Task 6: Final Verification

**Files:**
- No source files expected unless verification exposes a defect.

- [x] **Step 1: Run the full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [x] **Step 2: Inspect git status**

Run:

```bash
git status --short
```

Expected: no unstaged or uncommitted changes unless the final verification exposed a defect that was fixed.

- [x] **Step 3: Leave the branch clean**

If Step 1 exposed a defect, fix it with a small patch, rerun `npm test`, and inspect:

```bash
git status --short
```

Expected: no uncommitted changes after the fix has been committed by the task that introduced it.

## Self-Review

Spec coverage:

- Source `security` block: Task 1.
- Build security local/docker/vm modes: Task 1.
- VirtualBox-only New MVP VM provider with future cloud provider path preserved: Task 1 and docs in Task 5.
- Official build and app profiles: Task 1.
- App `profile`, `profileFile`, `policy`, `overrides`, and `violationAction`: Task 1.
- Static app security checks: Task 3.
- AI security review: Task 4.
- Structured security report: Task 2 and Task 3.
- Local build warning: Task 2.
- Documentation and example usage: Task 5.

Placeholder scan:

- No unresolved placeholder markers or unnamed follow-up steps remain.

Type consistency:

- `security.build`, `security.app`, `violationAction`, `profileFile`, `policy`, `overrides`, `securityReport`, `staticChecks`, `aiReview`, and `finalStatus` are used consistently across tasks.
