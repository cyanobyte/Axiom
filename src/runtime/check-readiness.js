export function checkReadiness(definition) {
  const diagnostics = [];

  if (definition.web?.kind === 'full-stack') {
    if (!definition.build?.commands?.test) {
      diagnostics.push(createBlockingDiagnostic('Missing build.commands.test for full-stack web app execution.'));
    }

    if (!definition.web.frontend?.framework) {
      diagnostics.push(createBlockingDiagnostic('Missing web.frontend.framework for full-stack web app execution.'));
    }

    if (!definition.web.api?.endpoints?.length) {
      diagnostics.push(createBlockingDiagnostic('Missing web.api.endpoints for full-stack web app execution.'));
    }

    if (!definition.architecture?.components?.length) {
      diagnostics.push(createBlockingDiagnostic('Missing architecture.components for full-stack web app execution.'));
    }
  }

  return diagnostics;
}

function createBlockingDiagnostic(message) {
  return {
    severity: 'error',
    message
  };
}
