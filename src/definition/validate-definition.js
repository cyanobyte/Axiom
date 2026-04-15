/**
 * Purpose: Validate authored intent definitions before runtime execution.
 * Responsibilities:
 * - Enforce required and recognized top-level sections.
 * - Require at least one domain section.
 * - Verify that declared verification coverage points at known clauses.
 */
import {
  COMPACT_CORE_SECTIONS,
  DOMAIN_SECTIONS,
  OPTIONAL_SECTIONS,
  REQUIRED_SECTIONS
} from './recognized-sections.js';
import { normalizeSecurityPolicy } from '../security/normalize-security-policy.js';

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function deriveDefinitionId(definition) {
  return (
    slugify(definition.meta?.title) ||
    slugify(definition.what?.capability) ||
    'intent-file'
  );
}

function normalizeVerification(verification = {}) {
  return {
    intent: Array.isArray(verification.intent) ? verification.intent : [],
    outcome: Array.isArray(verification.outcome) ? verification.outcome : []
  };
}

function normalizeCompactCliDefinition(definition) {
  if (!definition.cli) {
    return {};
  }

  const hasRequiredArguments = Array.isArray(definition.cli.arguments)
    ? definition.cli.arguments.some((argument) => /^<.+>$/.test(argument))
    : false;

  return {
    constraints: definition.constraints ?? [
      {
        id: 'must-run-cli-command',
        text: 'The tool runs as a CLI command.',
        severity: 'error'
      },
      ...(hasRequiredArguments
        ? [
            {
              id: 'must-accept-required-arguments',
              text: 'The tool accepts the declared required CLI arguments.',
              severity: 'error'
            }
          ]
        : [])
    ],
    outcomes: definition.outcomes ?? [
      {
        id: 'cli-command-runs',
        text: 'Running the command with the declared arguments succeeds.'
      },
      ...(hasRequiredArguments
        ? [
            {
              id: 'cli-usage-is-clear',
              text: 'Running the command without required arguments shows a clear usage error.'
            }
          ]
        : [])
    ],
    verification:
      definition.verification ??
      {
        intent: [
          {
            id: 'plan-covers-cli-flow',
            covers: [
              'must-run-cli-command',
              ...(hasRequiredArguments ? ['must-accept-required-arguments'] : [])
            ]
          }
        ],
        outcome: [
          {
            id: 'cli-flow',
            covers: [
              'cli-command-runs',
              ...(hasRequiredArguments ? ['cli-usage-is-clear'] : [])
            ]
          }
        ]
      }
  };
}

function normalizeCompactDefinition(definition) {
  if (!COMPACT_CORE_SECTIONS.every((key) => key in definition)) {
    return definition;
  }

  if (!DOMAIN_SECTIONS.some((key) => key in definition)) {
    return definition;
  }

  const cliDefaults = normalizeCompactCliDefinition(definition);

  return {
    ...definition,
    id: definition.id ?? deriveDefinitionId(definition),
    why: definition.why ?? {
      problem: definition.what?.description ?? definition.what?.capability ?? 'Compact intent definition',
      value: `Deliver ${definition.meta?.title ?? deriveDefinitionId(definition)}.`
    },
    scope: {
      includes: Array.isArray(definition.scope?.includes) ? definition.scope.includes : [],
      excludes: Array.isArray(definition.scope?.excludes) ? definition.scope.excludes : []
    },
    constraints: Array.isArray(cliDefaults.constraints)
      ? cliDefaults.constraints
      : Array.isArray(definition.constraints)
        ? definition.constraints
        : [],
    outcomes: Array.isArray(cliDefaults.outcomes)
      ? cliDefaults.outcomes
      : Array.isArray(definition.outcomes)
        ? definition.outcomes
        : [],
    verification: normalizeVerification(cliDefaults.verification ?? definition.verification)
  };
}

/**
 * Validate a cloned intent definition and return it on success.
 *
 * @param {object} definition
 * @returns {object}
 */
export function validateDefinition(definition) {
  const normalized = normalizeCompactDefinition(definition);

  for (const key of REQUIRED_SECTIONS) {
    if (!(key in normalized)) {
      throw new Error(`Missing required section: ${key}`);
    }
  }

  const allowed = new Set([...REQUIRED_SECTIONS, ...OPTIONAL_SECTIONS]);
  for (const key of Object.keys(normalized)) {
    if (!allowed.has(key)) {
      throw new Error(`Unknown top-level section: ${key}`);
    }
  }

  if (normalized.security) {
    normalized.security = normalizeSecurityPolicy(normalized.security);
  }

  if (!DOMAIN_SECTIONS.some((key) => key in normalized)) {
    throw new Error('At least one domain section is required');
  }

  const clauseIds = new Set([
    ...normalized.constraints.map((item) => item.id),
    ...normalized.outcomes.map((item) => item.id)
  ]);

  for (const group of ['intent', 'outcome']) {
    for (const item of normalized.verification[group]) {
      for (const covered of item.covers) {
        if (!clauseIds.has(covered)) {
          throw new Error(`Unknown verification coverage id: ${covered}`);
        }
      }
    }
  }

  return normalized;
}
