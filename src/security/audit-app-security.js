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
