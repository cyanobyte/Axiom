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
    finalStatus: 'pass'
  };
}
