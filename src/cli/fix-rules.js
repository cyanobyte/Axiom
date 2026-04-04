/**
 * Purpose: Define the first set of machine-applicable source fixes exposed by the CLI.
 * Responsibilities:
 * - Identify when a fix applies to a loaded intent definition.
 * - Describe the fix consistently for `analyze` and `fix`.
 * - Apply supported source rewrites deterministically.
 */

const FIX_RULES = [
  {
    id: 'web-build-test-command',
    severity: 'error',
    section: 'build',
    message: 'Full-stack web intents must declare build.commands.test.',
    nextAction: 'Add build.commands.test or run `ax fix <file.axiom.js> --apply web-build-test-command`.',
    type: 'add-build-test-command',
    label: 'Add the missing npm test command to the existing build.commands block.',
    appliedMessage: 'Added `build.commands.test: "npm test"` to the build block.',
    applies({ definition, source }) {
      return (
        definition.web?.kind === 'full-stack' &&
        !definition.build?.commands?.test &&
        hasPropertyBlock(source, 'build') &&
        hasPropertyBlock(source, 'commands')
      );
    },
    apply({ source }) {
      return addBuildTestCommand(source);
    }
  },
  {
    id: 'meta-summary',
    severity: 'warning',
    section: 'meta',
    message: 'Intent metadata should include meta.summary.',
    nextAction: 'Add meta.summary to make the authored intent easier to review and analyze.',
    type: 'add-meta-summary',
    label: 'Add meta.summary using the current intent description.',
    appliedMessage: 'Added meta.summary using the current intent description.',
    applies({ definition, source }) {
      return !definition.meta?.summary && hasPropertyBlock(source, 'meta');
    },
    apply({ source, definition }) {
      const summary = definition.what?.description ?? `Axiom intent for ${definition.meta?.title ?? 'this project'}.`;
      return addMetaSummary(source, summary);
    }
  },
  {
    id: 'empty-scope',
    severity: 'suggestion',
    section: 'scope',
    message: 'Explicit empty scope blocks can be omitted.',
    nextAction: 'Remove the empty scope block unless this intent needs explicit scope entries.',
    type: 'remove-empty-scope',
    label: 'Remove an explicit empty scope block.',
    appliedMessage: 'Removed the explicit empty scope block.',
    applies({ definition, source }) {
      return (
        hasPropertyBlock(source, 'scope') &&
        Array.isArray(definition.scope?.includes) &&
        definition.scope.includes.length === 0 &&
        Array.isArray(definition.scope?.excludes) &&
        definition.scope.excludes.length === 0
      );
    },
    apply({ source }) {
      return removePropertyBlock(source, 'scope');
    }
  },
  {
    id: 'compact-build-defaults',
    severity: 'suggestion',
    section: 'build',
    message: 'Compact CLI intents can omit the default npm build configuration.',
    nextAction: 'Remove build and rely on compact defaults unless this project needs custom commands.',
    type: 'remove-default-build',
    label: 'Remove redundant default npm build block from a compact CLI intent.',
    appliedMessage: 'Removed the redundant default npm build block.',
    applies({ definition, source }) {
      if (!definition?.cli || !definition?.build || !hasPropertyBlock(source, 'build')) {
        return false;
      }

      const commands = definition.build.commands ?? {};
      return (
        definition.build.system === 'npm' &&
        definition.build.test_runner === 'npm' &&
        commands.install === 'npm install' &&
        commands.test === 'npm test'
      );
    },
    apply({ source }) {
      return removePropertyBlock(source, 'build');
    }
  }
];

export function findApplicableFixes(context) {
  return FIX_RULES.filter((rule) => rule.applies(context)).map(toFixDescriptor);
}

export function findFixById(id) {
  const rule = FIX_RULES.find((candidate) => candidate.id === id);
  return rule ? toFixDescriptor(rule) : null;
}

export function appliesFix(id, context) {
  const rule = FIX_RULES.find((candidate) => candidate.id === id);
  return rule ? rule.applies(context) : false;
}

export function applyFixToSource(id, context) {
  const rule = FIX_RULES.find((candidate) => candidate.id === id);
  if (!rule) {
    throw new Error(`Unsupported fix id: ${id}`);
  }

  return rule.apply(context);
}

function toFixDescriptor(rule) {
  return {
    id: rule.id,
    severity: rule.severity,
    section: rule.section,
    message: rule.message,
    nextAction: rule.nextAction,
    type: rule.type,
    label: rule.label,
    appliedMessage: rule.appliedMessage
  };
}

function hasPropertyBlock(source, propertyName) {
  return new RegExp(`(^\\s*)${propertyName}:\\s*\\{`, 'm').test(source);
}

function findPropertyBlock(source, propertyName) {
  const pattern = new RegExp(`(^\\s*)${propertyName}:\\s*\\{`, 'm');
  const match = pattern.exec(source);
  if (!match) {
    return null;
  }

  const propertyStart = match.index;
  const braceStart = source.indexOf('{', propertyStart);
  const braceEnd = findMatchingBrace(source, braceStart);
  return {
    propertyStart,
    braceStart,
    braceEnd,
    indent: match[1]
  };
}

function addBuildTestCommand(source) {
  const commandsMatch = findPropertyBlock(source, 'commands');
  if (!commandsMatch) {
    throw new Error('Could not find `commands` block in source file.');
  }

  return insertPropertyLine(source, commandsMatch.braceEnd, `${commandsMatch.indent}  test: "npm test"`);
}

function addMetaSummary(source, summary) {
  const metaMatch = findPropertyBlock(source, 'meta');
  if (!metaMatch) {
    throw new Error('Could not find `meta` block in source file.');
  }

  return insertPropertyLine(source, metaMatch.braceEnd, `${metaMatch.indent}  summary: "${escapeString(summary)}"`);
}

function removePropertyBlock(source, propertyName) {
  const match = findPropertyBlock(source, propertyName);
  if (!match) {
    throw new Error(`Could not find \`${propertyName}\` block in source file.`);
  }

  let blockEnd = match.braceEnd + 1;

  while (blockEnd < source.length && (source[blockEnd] === ' ' || source[blockEnd] === '\t')) {
    blockEnd += 1;
  }
  if (source[blockEnd] === ',') {
    blockEnd += 1;
  }
  if (source[blockEnd] === '\r' && source[blockEnd + 1] === '\n') {
    blockEnd += 2;
  } else if (source[blockEnd] === '\n') {
    blockEnd += 1;
  }
  if (source[blockEnd] === '\r' && source[blockEnd + 1] === '\n') {
    blockEnd += 2;
  } else if (source[blockEnd] === '\n') {
    blockEnd += 1;
  }

  return source.slice(0, match.propertyStart) + source.slice(blockEnd);
}

function insertPropertyLine(source, objectBraceEnd, propertyLine) {
  const closingLineStart = source.lastIndexOf('\n', objectBraceEnd - 1) + 1;
  let updated = source;

  let previousIndex = closingLineStart - 1;
  while (previousIndex >= 0 && /\s/.test(updated[previousIndex])) {
    previousIndex -= 1;
  }
  if (previousIndex >= 0 && updated[previousIndex] !== '{' && updated[previousIndex] !== ',') {
    updated = `${updated.slice(0, previousIndex + 1)},${updated.slice(previousIndex + 1)}`;
  }

  const adjustedClosingLineStart = updated.lastIndexOf('\n', objectBraceEnd - 1) + 1;
  return `${updated.slice(0, adjustedClosingLineStart)}${propertyLine}\n${updated.slice(adjustedClosingLineStart)}`;
}

function findMatchingBrace(source, braceStart) {
  let depth = 0;
  let inString = false;
  let stringQuote = null;
  let escaped = false;

  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === stringQuote) {
        inString = false;
        stringQuote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      stringQuote = char;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  throw new Error('Could not find the end of the source block.');
}

function escapeString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
