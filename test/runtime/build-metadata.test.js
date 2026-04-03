import { describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import {
  readBuildMetadata,
  readBuildState,
  writeBuildMetadata
} from '../../src/runtime/build-metadata.js';
import { createLocalWorkspaceAdapter } from '../../src/adapters/create-local-workspace-adapter.js';

describe('build metadata', () => {
  it('writes and reads the last successful build metadata', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'axiom-build-meta-'));
    const workspace = createLocalWorkspaceAdapter(root);

    await writeBuildMetadata(workspace, {
      intentVersion: '1.0.0',
      generatedFiles: ['dist/app.js']
    });

    await expect(readBuildMetadata(root)).resolves.toMatchObject({
      intentVersion: '1.0.0',
      generatedFiles: ['dist/app.js']
    });
  });

  it('reports stale generated output when the stored version differs from the intent version', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'axiom-build-state-'));
    const workspace = createLocalWorkspaceAdapter(root);

    await writeBuildMetadata(workspace, {
      intentVersion: '1.0.0',
      generatedFiles: ['dist/app.js']
    });

    await expect(readBuildState(root, '1.1.0')).resolves.toEqual({
      status: 'stale',
      previousVersion: '1.0.0',
      intentVersion: '1.1.0',
      generatedFiles: ['dist/app.js']
    });
  });
});
