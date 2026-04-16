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
