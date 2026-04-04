/**
 * Purpose: Provide the user-facing CLI command handler for existing-project bootstrap.
 * Responsibilities:
 * - Parse `ax init --existing <path>` arguments.
 * - Inspect a target project directory for a minimal starter shape.
 * - Emit a starter `.axiom.js` file and next-step guidance.
 */
import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Run the `ax init --existing` command with injected inspection and file-writing dependencies.
 *
 * @param {string[]} args
 * @param {object} dependencies
 * @param {Function} [dependencies.inspectExistingProject]
 * @param {Function} [dependencies.writeStarterIntentFile]
 * @param {object} dependencies.logger
 * @returns {Promise<number>}
 */
export async function initCommand(
  args,
  {
    inspectExistingProject = inspectExistingProjectDefault,
    writeStarterIntentFile = writeStarterIntentFileDefault,
    logger
  }
) {
  if (args[0] !== '--existing' || !args[1]) {
    logger.error('Usage: ax init --existing <path>');
    return 1;
  }

  const targetPath = path.resolve(args[1]);
  const project = await inspectExistingProject(targetPath);
  const filename = `${project.projectName}.axiom.js`;
  const content = renderStarterIntent(project);

  await writeStarterIntentFile(targetPath, filename, content);

  logger.log(`Wrote starter intent file: ${path.join(targetPath, filename)}`);
  logger.log('Next: add axiom.config.js, refine the generated intent, then run `ax analyze <file.axiom.js>`.');
  return 0;
}

async function inspectExistingProjectDefault(targetPath) {
  const packageJsonPath = path.join(targetPath, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  const publicDirExists = await fs
    .stat(path.join(targetPath, 'public'))
    .then((stat) => stat.isDirectory())
    .catch(() => false);

  return {
    targetPath,
    projectName: packageJson.name ?? path.basename(targetPath),
    testCommand: packageJson.scripts?.test ?? 'npm test',
    domain:
      packageJson.dependencies?.express || publicDirExists
        ? 'web'
        : 'library'
  };
}

async function writeStarterIntentFileDefault(targetPath, filename, content) {
  await fs.writeFile(path.join(targetPath, filename), content, 'utf8');
}

function renderStarterIntent(project) {
  const domainBlock = project.domain === 'web'
    ? `    web: {\n      kind: "full-stack"\n    }\n`
    : `    library: {\n      kind: "package"\n    }\n`;

  return `import { intent } from "@science451/intent-runtime";

export default intent(
  {
    meta: {
      title: "${escapeString(project.projectName)}"
    },
    what: {
      capability: "${escapeString(slugify(project.projectName))}",
      description: "A starter Axiom file for the existing ${escapeString(project.projectName)} project."
    },
    runtime: {
      languages: ["javascript"],
      targets: ["node"],
      platforms: ["linux", "macos", "windows"]
    },
    build: {
      system: "npm",
      test_runner: "npm",
      commands: {
        test: "${escapeString(project.testCommand)}"
      }
    },
${domainBlock}  },
  async (_ctx) => {
    // Refine this starter intent with real constraints, outcomes, and workflow steps.
    return { ok: true };
  }
);
`;
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function escapeString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
