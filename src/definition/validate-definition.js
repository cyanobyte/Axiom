import { DOMAIN_SECTIONS, OPTIONAL_SECTIONS, REQUIRED_SECTIONS } from './recognized-sections.js';

export function validateDefinition(definition) {
  for (const key of REQUIRED_SECTIONS) {
    if (!(key in definition)) {
      throw new Error(`Missing required section: ${key}`);
    }
  }

  const allowed = new Set([...REQUIRED_SECTIONS, ...OPTIONAL_SECTIONS]);
  for (const key of Object.keys(definition)) {
    if (!allowed.has(key)) {
      throw new Error(`Unknown top-level section: ${key}`);
    }
  }

  if (!DOMAIN_SECTIONS.some((key) => key in definition)) {
    throw new Error('At least one domain section is required');
  }

  const clauseIds = new Set([
    ...definition.constraints.map((item) => item.id),
    ...definition.outcomes.map((item) => item.id)
  ]);

  for (const group of ['intent', 'outcome']) {
    for (const item of definition.verification[group]) {
      for (const covered of item.covers) {
        if (!clauseIds.has(covered)) {
          throw new Error(`Unknown verification coverage id: ${covered}`);
        }
      }
    }
  }

  return definition;
}
