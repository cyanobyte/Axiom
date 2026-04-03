import { describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { materializeFiles } from '../../src/runtime/materialize-files.js';

describe('materializeFiles', () => {
  it('writes generated files into the workspace root', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'axiom-materialize-'));

    await materializeFiles(
      {
        root: () => root,
        write: async (filePath, content) => {
          const resolvedPath = path.join(root, filePath);
          await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
          await fs.writeFile(resolvedPath, content, 'utf8');
        }
      },
      [
        { path: 'app/index.html', content: '<h1>Hello</h1>' }
      ]
    );

    expect(await fs.readFile(path.join(root, 'app/index.html'), 'utf8')).toContain('Hello');
  });
});
