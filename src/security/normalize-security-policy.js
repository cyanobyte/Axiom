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
