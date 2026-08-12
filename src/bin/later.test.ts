import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { later } from './later.ts';

let root: string;
let repoRoot: string;
let laterFile: string;

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

beforeAll(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'later-cli-'));
  repoRoot = path.join(root, 'example-repo');
  laterFile = path.join(root, 'Later.md');
  await fs.mkdir(repoRoot);
  git('init', '--initial-branch=main');
  git('config', 'user.name', 'Later Test');
  git('config', 'user.email', 'later@example.com');
  await fs.writeFile(path.join(repoRoot, 'example.txt'), 'example\n');
  git('add', 'example.txt');
  git('commit', '-m', 'Initial commit');
});

afterAll(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe(later, () => {
  test('creates and appends contextual records with Git metadata', async () => {
    const now = new Date(2026, 6, 5, 9, 8);

    await later(
      {
        heading: 'First deferred idea',
        paragraph: 'Deferred to preserve the scope of the current task.',
      },
      laterFile,
      repoRoot,
      now
    );
    await later(
      {
        heading: 'Second deferred idea',
        paragraph: 'Related code is in `src/example.ts`.',
      },
      laterFile,
      repoRoot,
      now
    );

    await expect(fs.readFile(laterFile, 'utf8')).resolves.toBe(
      '## First deferred idea\n\n' +
        '2026-07-05_0908 — example-repo on main\n\n' +
        'Deferred to preserve the scope of the current task.\n\n' +
        '## Second deferred idea\n\n' +
        '2026-07-05_0908 — example-repo on main\n\n' +
        'Related code is in `src/example.ts`.\n'
    );
  });

  test('uses the commit hash in detached HEAD state', async () => {
    const commit = git('rev-parse', '--short', 'HEAD');
    git('switch', '--detach', commit);

    try {
      await later(
        {
          heading: 'Detached work',
          paragraph: 'Captured while inspecting an old revision.',
        },
        laterFile,
        repoRoot,
        new Date(2026, 6, 5, 10, 9)
      );

      await expect(fs.readFile(laterFile, 'utf8')).resolves.toContain(
        `\`2026-07-05_1009\` · \`example-repo\` · \`${commit}\``
      );
    } finally {
      git('switch', 'main');
    }
  });
});
