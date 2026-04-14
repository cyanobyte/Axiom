# New MVP Security Design

## Goal

Make Axiom more viable for market use by adding source-declared security policy to `.axiom.js` files. The New MVP introduces one top-level `security` block that defines:

- how AI-backed build work is allowed to execute
- what security posture the generated application must satisfy

These policies are compiler inputs, not comments. Axiom validates them before execution, passes them into generation context, uses them during build and audit, and writes security results into build output metadata.

## Source Shape

Security policy lives under a top-level `security` section:

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

`security.build` protects the development and build process.

`security.app` protects the generated application.

Both sections resolve into normalized internal policy objects so runtime code does not need to reason over every user-facing declaration shape.

## Build Security

`security.build` defines how AI-backed generation, shell commands, package installation, verification, and related build steps are allowed to execute.

### Local Mode

```js
security: {
  build: {
    mode: "local"
  }
}
```

`local` is the convenience mode. It runs on the host machine and is only constrained to Axiom's assigned project or generated workspace boundary.

Local mode does not promise process isolation, network isolation, package isolation, or secrets protection. When local mode is used with AI-backed execution, Axiom must emit a clear warning.

### Docker Mode

```js
security: {
  build: {
    mode: "docker",
    profile: "node-webapp"
  }
}
```

`docker` is the preferred secure build mode for the New MVP. It uses Axiom-provided profiles only. Arbitrary user-provided Docker images are out of scope.

A Docker build profile resolves to an official image plus locked execution settings, including:

- workspace mount rules
- user and filesystem permissions
- network behavior
- environment variable allowlist
- resource limits
- permitted build tools

### VM Mode

```js
security: {
  build: {
    mode: "vm",
    provider: "virtualbox",
    profile: "node-webapp"
  }
}
```

`vm` is the strongest New MVP isolation path. It uses Packer-backed Axiom-provided profiles.

New MVP supports only:

```js
provider: "virtualbox"
```

The schema must preserve a future path for cloud VM providers:

```js
provider: "aws"
provider: "google-cloud"
provider: "azure"
```

In future versions, `mode: "vm"` means Axiom can run AI/build work in a VM image produced or provisioned through Packer-compatible infrastructure. New MVP does not support cloud VM execution or custom Packer templates.

### Shared Build Profile Names

Profile names should be shared across Docker and VM where practical. For example, `node-webapp` should represent the same broad build capability set whether it is enforced through Docker or a VirtualBox VM.

## Application Security

`security.app` defines the allowed security posture of the generated application. It is used before, during, and after generation.

New MVP application targets are:

- `web-app`
- `desktop-app`
- `phone-app`

Before generation, Axiom validates that the app intent is compatible with the declared target and security profile.

During generation, Axiom includes the app security profile in AI instructions and inspects intermediate output where practical.

After generation, Axiom runs deterministic static checks and an AI security review, then emits a structured security report.

### Official Profile

```js
security: {
  app: {
    target: "web-app",
    profile: "browser-app-basic",
    violationAction: "break"
  }
}
```

`profile` selects an official Axiom application security profile.

### Official Profile With Overrides

```js
security: {
  app: {
    target: "web-app",
    profile: "browser-app-basic",
    overrides: {
      network: {
        allowed: ["https://api.example.com"]
      }
    },
    violationAction: "break"
  }
}
```

`overrides` allows project-specific changes on top of an official profile while preserving the profile baseline.

### Custom Profile File

```js
security: {
  app: {
    target: "web-app",
    profileFile: "./security/browser-app-basic.json",
    violationAction: "warn"
  }
}
```

`profileFile` points to a project-local custom profile file. The file must conform to Axiom's application security profile schema.

### Inline Policy

```js
security: {
  app: {
    target: "web-app",
    policy: {
      network: {
        allowed: ["https://api.example.com"],
        denied: ["*"]
      },
      storage: {
        allowed: ["localStorage"],
        denied: ["cookies"]
      },
      secrets: "none",
      filesystem: "none"
    },
    violationAction: "break"
  }
}
```

`policy` declares a fully inline custom application security policy.

### Profile Resolution Rules

Axiom resolves exactly one app security policy source:

- `profile`: use an official Axiom profile
- `profile` plus `overrides`: use an official Axiom profile with project-specific overrides
- `profileFile`: use a project-local custom schema file
- `policy`: use a fully inline custom policy

Ambiguous combinations are invalid. For New MVP, `profileFile` plus `policy` must be rejected.

## Violation Action

`security.app.violationAction` defines how Axiom responds to application security violations:

```js
violationAction: "break"
violationAction: "warn"
```

`break` fails the build when the final app security status contains blocking violations.

`warn` records findings and allows the build to complete.

If `violationAction` is omitted, Axiom defaults to `break` for official profiles and requires an explicit value for `profileFile` or `policy`.

New MVP uses a single top-level violation action. Per-rule violation actions are out of scope.

## Enforcement And Reporting

Axiom must produce a normalized security result for every build that declares a `security` block:

```js
securityReport: {
  build: {
    mode: "docker",
    profile: "node-webapp",
    status: "pass",
    warnings: []
  },
  app: {
    target: "web-app",
    profile: "browser-app-basic",
    staticChecks: {
      status: "pass",
      findings: []
    },
    aiReview: {
      status: "warning",
      findings: []
    },
    finalStatus: "pass"
  }
}
```

Build security enforcement:

- `security.build.local`: enforce the workspace boundary where Axiom controls file materialization, and warn that the process itself is not sandboxed
- `security.build.docker`: enforce through Axiom-owned Docker profiles
- `security.build.vm`: enforce through Packer-backed official profiles with `provider: "virtualbox"`

App security enforcement:

- run deterministic static checks against generated output
- run AI security review against generated output and the normalized app policy
- combine static and AI findings into a final app security status
- apply `violationAction`

Security reports should be written into generated output metadata so teams can inspect them after a build, use them in CI, and compare them across builds.

## New MVP Scope

Included:

- `security` schema in `.axiom.js`
- `security.build` with `local`, `docker`, and `vm`
- official named Docker build profiles
- official named VM build profiles
- `provider: "virtualbox"` for New MVP VM execution
- future-compatible provider model for `aws`, `google-cloud`, and `azure`
- `security.app` with `target`, `profile`, `profileFile`, `policy`, `overrides`, and `violationAction`
- official application profiles
- custom application profile files
- inline application policies
- normalized internal policy resolution
- static app security checks
- AI security review
- structured security report artifact
- clear warnings for local build mode

Out of scope:

- arbitrary Docker images
- custom Packer templates
- cloud VM execution
- per-rule violation actions
- full package vulnerability scanning
- formal compliance frameworks such as SOC 2, HIPAA, PCI, or FedRAMP
- runtime monitoring of deployed applications

## Market Positioning

The New MVP security story is:

> Axiom lets teams declare how the AI is allowed to build and what the generated app is allowed to do, then audits the result.

This supports a marketable trust claim without overloading the first implementation with every possible compliance, infrastructure, or runtime monitoring feature.
