# Docker Runner Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reproducible `node-webapp` Docker runner image definition and local build/smoke commands.

**Architecture:** Keep the runner image definition under `docker/runner/node-webapp/` and expose local workflows through `package.json` scripts. Add deterministic tests that inspect the Dockerfile, README, and package scripts without requiring Docker, then manually verify the Docker build/smoke commands with the local daemon.

**Tech Stack:** Node.js ESM, Vitest, Docker CLI, npm scripts.

---

## Task 1: Docker Runner Image Contract Test

**Files:**
- Create: `test/docker/runner-image.test.js`

- [ ] **Step 1: Write failing contract test**

Create `test/docker/runner-image.test.js`:

```js
import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';

const imageTag = 'ghcr.io/science451/axiom-build-node-webapp:latest';

describe('node-webapp Docker runner image', () => {
  it('defines the runtime image contract and package scripts', async () => {
    const dockerfile = await fs.readFile('docker/runner/node-webapp/Dockerfile', 'utf8');
    const readme = await fs.readFile('docker/runner/node-webapp/README.md', 'utf8');
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));

    expect(dockerfile).toContain('FROM node:22-bookworm');
    expect(dockerfile).toContain('RUN npm ci --omit=optional');
    expect(dockerfile).toContain('RUN npm link');
    expect(dockerfile).toContain('WORKDIR /workspace/source');
    expect(dockerfile).toContain('/workspace/generated');
    expect(dockerfile).toContain('/workspace/reports');
    expect(packageJson.scripts['docker:runner:build']).toBe(
      `docker build -f docker/runner/node-webapp/Dockerfile -t ${imageTag} .`
    );
    expect(packageJson.scripts['docker:runner:smoke']).toBe(
      `docker run --rm ${imageTag} ax --help`
    );
    expect(readme).toContain(imageTag);
  });
});
```

- [ ] **Step 2: Run red test**

Run: `npx vitest run test/docker/runner-image.test.js`

Expected: FAIL because the Dockerfile, README, and scripts do not exist yet.

## Task 2: Dockerfile, README, And Scripts

**Files:**
- Create: `docker/runner/node-webapp/Dockerfile`
- Create: `docker/runner/node-webapp/README.md`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Add Dockerfile**

Create `docker/runner/node-webapp/Dockerfile`:

```Dockerfile
FROM node:22-bookworm

WORKDIR /opt/axiom

COPY package.json package-lock.json ./
RUN npm ci --omit=optional

COPY bin ./bin
COPY src ./src
RUN npm link

RUN mkdir -p /workspace/source /workspace/generated /workspace/reports

WORKDIR /workspace/source
```

- [ ] **Step 2: Add README**

Create `docker/runner/node-webapp/README.md` with local build, smoke, publish, and runner contract notes.

- [ ] **Step 3: Add package scripts**

Modify `package.json`:

```json
"scripts": {
  "test": "vitest run",
  "docker:runner:build": "docker build -f docker/runner/node-webapp/Dockerfile -t ghcr.io/science451/axiom-build-node-webapp:latest .",
  "docker:runner:smoke": "docker run --rm ghcr.io/science451/axiom-build-node-webapp:latest ax --help"
}
```

Run `npm install --package-lock-only` to refresh `package-lock.json`.

- [ ] **Step 4: Run green test**

Run: `npx vitest run test/docker/runner-image.test.js`

Expected: PASS.

## Task 3: Verification And Commit

**Files:**
- All files from Tasks 1 and 2

- [ ] **Step 1: Run full tests**

Run: `npm test`

Expected: all non-skipped tests pass.

- [ ] **Step 2: Build Docker runner image**

Run: `sudo -n npm run docker:runner:build`

Expected: Docker builds `ghcr.io/science451/axiom-build-node-webapp:latest`.

- [ ] **Step 3: Smoke Docker runner image**

Run: `sudo -n npm run docker:runner:smoke`

Expected: command exits `0` and prints Axiom CLI usage text.

- [ ] **Step 4: Commit**

```bash
git add docker/runner/node-webapp/Dockerfile docker/runner/node-webapp/README.md package.json package-lock.json test/docker/runner-image.test.js docs/superpowers/plans/2026-04-17-docker-runner-image.md
git commit -m "feat: add docker runner image definition"
```

## Self-Review

- Spec coverage: Dockerfile, README, scripts, deterministic tests, local build, and local smoke are covered.
- Placeholder scan: No placeholder terms are used.
- Type consistency: The image tag and script names match the design spec and existing build profile.
