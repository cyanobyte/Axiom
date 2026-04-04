/**
 * Purpose: Define the first set of machine-applicable source fixes exposed by the CLI.
 * Responsibilities:
 * - Identify when a fix applies to a loaded intent definition.
 * - Describe the fix consistently for `analyze` and `fix`.
 * - Apply supported source rewrites deterministically.
 */

const COMPACT_BUILD_DEFAULTS_FIX = {
  id: 'compact-build-defaults',
  type: 'remove-default-build',
  label: 'Remove redundant default npm build block from a compact CLI intent.'
};

export function findApplicableFixes(definition) {
  const fixes = [];

  if (hasRedundantCompactBuild(definition)) {
    fixes.push(COMPACT_BUILD_DEFAULTS_FIX);
  }

  return fixes;
}

export function findFixById(id) {
  if (id === COMPACT_BUILD_DEFAULTS_FIX.id) {
    return COMPACT_BUILD_DEFAULTS_FIX;
  }

  return null;
}

export function appliesFix(id, definition) {
  if (id === COMPACT_BUILD_DEFAULTS_FIX.id) {
    return hasRedundantCompactBuild(definition);
  }

  return false;
}

export function applyFixToSource(id, source) {
  if (id === COMPACT_BUILD_DEFAULTS_FIX.id) {
    return removePropertyBlock(source, 'build');
  }

  throw new Error(`Unsupported fix id: ${id}`);
}

function hasRedundantCompactBuild(definition) {
  if (!definition?.cli || !definition?.build) {
    return false;
  }

  const commands = definition.build.commands ?? {};
  return (
    definition.build.system === 'npm' &&
    definition.build.test_runner === 'npm' &&
    commands.install === 'npm install' &&
    commands.test === 'npm test'
  );
}

function removePropertyBlock(source, propertyName) {
  const propertyPattern = new RegExp(`(^\\s*)${propertyName}:\\s*\\{`, 'm');
  const match = propertyPattern.exec(source);
  if (!match) {
    throw new Error(`Could not find \`${propertyName}\` block in source file.`);
  }

  const propertyStart = match.index;
  const braceStart = source.indexOf('{', propertyStart);
  const braceEnd = findMatchingBrace(source, braceStart);
  let blockEnd = braceEnd + 1;

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

  return source.slice(0, propertyStart) + source.slice(blockEnd);
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

  throw new Error('Could not find the end of the build block in source file.');
}
