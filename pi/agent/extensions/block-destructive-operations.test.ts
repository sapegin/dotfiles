import { execFile as execFileCallback } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  getDestructiveReason,
  isSafeProjectRm,
} from './block-destructive-operations.ts';

const execFile = promisify(execFileCallback);

describe(getDestructiveReason, () => {
  test.each([
    ['rm', 'rm'],
    ['rm dist/file.txt', 'rm'],
    ['rm -rf dist', 'rm'],
    ['rm -fr dist', 'rm'],
    ['rm -r -f dist', 'rm'],
    ['rm --recursive --force dist', 'rm'],
    ['mv old.txt new.txt', 'mv'],
    ['chmod 600 ~/.ssh/id_rsa', 'chmod'],
    ['chown user:group file.txt', 'chown'],
    ['sudo make install', 'sudo'],
    ['git reset HEAD~1', 'git reset'],
    ['git reset --hard HEAD~1', 'git reset'],
    ['git reset --merge', 'git reset'],
    ['git clean -n', 'git clean'],
    ['git clean -fd', 'git clean'],
    ['git clean --force -d', 'git clean'],
    ['git checkout main', 'git checkout'],
    ['git checkout -b new-branch', 'git checkout'],
    ['git checkout --force main', 'git checkout'],
    ['git checkout -f main', 'git checkout'],
    ['git checkout -- path/to/file', 'git checkout'],
    ['git switch main', 'git switch'],
    ['git rebase main', 'git rebase'],
    ['git push origin main', 'git push'],
    ['git push -f origin main', 'git push'],
    ['git push --force-with-lease origin main', 'git push'],
    ['git branch -d merged-branch', 'git branch'],
    ['git branch -D old-branch', 'git branch'],
    ['git branch --delete old-branch', 'git branch'],
    ['git branch -f rewritten-branch main', 'git branch'],
    ['git branch --force rewritten-branch main', 'git branch'],
    ['git branch -m old-name new-name', 'git branch'],
    ['git branch --move old-name new-name', 'git branch'],
    ['git branch -c source copy', 'git branch'],
    ['git branch --copy source copy', 'git branch'],
    ['git branch --delete --force old-branch', 'git branch'],
    ["git branch --format='%(refname:short)' -D old-branch", 'git branch'],
    ['git branch --unset-upstream feature', 'git branch'],
    ['git tag -d v1.0.0', 'git tag -d'],
    ['git tag --delete v1.0.0', 'git tag -d'],
    ['git stash pop', 'git stash pop/drop/clear'],
    ['git stash drop stash@{0}', 'git stash pop/drop/clear'],
    ['git stash clear', 'git stash pop/drop/clear'],
    ['git commit -m "message"', 'git commit'],
    ['git commit --amend --no-edit', 'git commit'],
    ['git restore src/file.ts', 'git restore'],
    ['git restore --staged src/file.ts', 'git restore'],
    ['git restore --help', 'git restore'],
    ['find . -name node_modules -delete', 'find -delete'],
  ])('detects %s', (command, reason) => {
    expect(getDestructiveReason(command)).toBe(reason);
  });

  test.each([
    'git status',
    'git log --oneline',
    'git diff',
    'git fetch --all',
    'git pull',
    'git branch',
    'git branch feature',
    'git branch --show-current',
    'git branch --list feature',
    'git branch --contains HEAD',
    'git branch --all --no-color && git log --oneline --decorate -12',
    'git branch -r --list origin/main',
    "git branch --format='%(refname:short)'",
    'git branch --list --format %(refname:short)',
    'git add .',
    'echo find . -delete',
    'rg "find . -delete" docs',
  ])('allows %s', (command) => {
    expect(getDestructiveReason(command)).toBeUndefined();
  });
});

describe(isSafeProjectRm, () => {
  let repositoryPath: string;

  const executor = {
    async exec(command: string, args: string[]) {
      try {
        const result = await execFile(command, args);
        return { code: 0, stdout: result.stdout };
      } catch (error) {
        const result = error as { code?: number; stdout?: string };
        return { code: result.code ?? 1, stdout: result.stdout ?? '' };
      }
    },
  };

  beforeEach(async () => {
    repositoryPath = await fs.mkdtemp(
      path.join(os.tmpdir(), 'safe-project-rm-')
    );
    await execFile('git', ['init', '--quiet', repositoryPath]);
    await fs.writeFile(path.join(repositoryPath, 'tracked.txt'), 'original\n');
    await fs.mkdir(path.join(repositoryPath, 'nested'));
    await fs.writeFile(
      path.join(repositoryPath, 'nested', 'tracked.txt'),
      'nested\n'
    );
    await execFile('git', [
      '-C',
      repositoryPath,
      'add',
      'tracked.txt',
      'nested/tracked.txt',
    ]);
  });

  afterEach(async () => {
    await fs.rm(repositoryPath, { recursive: true, force: true });
  });

  test.each(['rm tracked.txt', 'rm -f tracked.txt', 'rm -- tracked.txt'])(
    'allows %s for a tracked, unchanged file',
    async (command) => {
      await expect(
        isSafeProjectRm(executor, repositoryPath, command)
      ).resolves.toBe(true);
    }
  );

  test('allows a tracked file beneath a nested project directory', async () => {
    await expect(
      isSafeProjectRm(
        executor,
        path.join(repositoryPath, 'nested'),
        'rm tracked.txt'
      )
    ).resolves.toBe(true);
  });

  test.each([
    'rm -rf tracked.txt',
    'rm ../tracked.txt',
    'rm "$TARGET"',
    'rm *.txt',
    'rm tracked.txt\vnested/tracked.txt',
    'rm tracked.txt && echo removed',
    'cd nested && rm tracked.txt',
  ])('rejects ambiguous command %s', async (command) => {
    await expect(
      isSafeProjectRm(executor, repositoryPath, command)
    ).resolves.toBe(false);
  });

  test('rejects an untracked file', async () => {
    await fs.writeFile(
      path.join(repositoryPath, 'untracked.txt'),
      'untracked\n'
    );

    await expect(
      isSafeProjectRm(executor, repositoryPath, 'rm untracked.txt')
    ).resolves.toBe(false);
  });

  test('treats Git pathspec syntax as a literal path', async () => {
    await fs.mkdir(path.join(repositoryPath, ':'));
    await fs.writeFile(
      path.join(repositoryPath, ':', 'tracked.txt'),
      'untracked\n'
    );

    await expect(
      isSafeProjectRm(executor, repositoryPath, 'rm :/tracked.txt')
    ).resolves.toBe(false);
  });

  test('rejects a modified tracked file', async () => {
    await fs.writeFile(path.join(repositoryPath, 'tracked.txt'), 'modified\n');

    await expect(
      isSafeProjectRm(executor, repositoryPath, 'rm tracked.txt')
    ).resolves.toBe(false);
  });

  test.each(['--assume-unchanged', '--skip-worktree'])(
    'rejects a modified file marked %s',
    async (indexOption) => {
      await execFile('git', [
        '-C',
        repositoryPath,
        'update-index',
        indexOption,
        'tracked.txt',
      ]);
      await fs.writeFile(
        path.join(repositoryPath, 'tracked.txt'),
        'modified\n'
      );

      await expect(
        isSafeProjectRm(executor, repositoryPath, 'rm tracked.txt')
      ).resolves.toBe(false);
    }
  );

  test('rejects directories', async () => {
    await expect(
      isSafeProjectRm(executor, repositoryPath, 'rm nested')
    ).resolves.toBe(false);
  });

  test('rejects files outside a Git worktree', async () => {
    const directoryPath = await fs.mkdtemp(
      path.join(os.tmpdir(), 'unsafe-project-rm-')
    );
    await fs.writeFile(path.join(directoryPath, 'file.txt'), 'content\n');

    try {
      await expect(
        isSafeProjectRm(executor, directoryPath, 'rm file.txt')
      ).resolves.toBe(false);
    } finally {
      await fs.rm(directoryPath, { recursive: true, force: true });
    }
  });
});
