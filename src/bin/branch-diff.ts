// Prints one review target as a diff. Pass the skill argument through unchanged:
// an existing file prints its full source, a commit SHA prints that commit, and
// no argument prints either the feature branch or main/master working changes.
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../util/args.ts';
import {
  getBaseBranch,
  getCurrentBranch,
  getGitRepoRoot,
  runGit,
} from '../util/git.ts';
import { run } from '../util/tui.ts';

function getFilePath(repoRoot: string, target: string): string | undefined {
  const filePath = path.isAbsolute(target)
    ? target
    : path.resolve(repoRoot, target);

  try {
    return fs.statSync(filePath).isFile() ? filePath : undefined;
  } catch {
    return undefined;
  }
}

function getCommit(repoRoot: string, target: string): string | undefined {
  if (!/^[a-f\d]{4,64}$/i.test(target)) {
    return undefined;
  }

  try {
    return execFileSync(
      'git',
      ['rev-parse', '--verify', '--quiet', `${target}^{commit}`],
      { cwd: repoRoot, encoding: 'utf8' }
    ).trim();
  } catch {
    return undefined;
  }
}

function printFile(repoRoot: string, filePath: string): void {
  const result = spawnSync(
    'git',
    ['diff', '--no-index', '--', '/dev/null', filePath],
    { cwd: repoRoot, stdio: 'inherit' }
  );
  if (result.error !== undefined) {
    throw result.error;
  }
  // `--no-index` returns 1 when it successfully finds differences.
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`git diff failed with status ${result.status}.`);
  }
}

function printMainChanges(repoRoot: string): void {
  runGit(['diff', 'HEAD'], { cwd: repoRoot });

  const untrackedFiles = execFileSync(
    'git',
    ['ls-files', '--others', '--exclude-standard', '-z'],
    { cwd: repoRoot, encoding: 'utf8' }
  )
    .split('\0')
    .filter(Boolean);

  for (const filePath of untrackedFiles) {
    printFile(repoRoot, filePath);
  }
}

function main(): void {
  const { target } = parseArgs([{ name: 'target', positional: true }]);
  const repoRoot = getGitRepoRoot();

  if (target !== undefined) {
    const filePath = getFilePath(repoRoot, target);
    if (filePath !== undefined) {
      printFile(repoRoot, filePath);
      return;
    }

    const commit = getCommit(repoRoot, target);
    if (commit !== undefined) {
      runGit(['show', '--format=', '--find-renames', commit], {
        cwd: repoRoot,
      });
      return;
    }

    throw new Error(`Target must be an existing file or commit SHA: ${target}`);
  }

  const currentBranch = getCurrentBranch();
  if (currentBranch === undefined) {
    throw new Error(
      'Cannot determine the current branch because HEAD is detached.'
    );
  }

  if (currentBranch === 'main' || currentBranch === 'master') {
    printMainChanges(repoRoot);
    return;
  }

  const baseBranch = getBaseBranch(repoRoot);
  runGit(['diff', `${baseBranch}...${currentBranch}`], { cwd: repoRoot });
}

await run(main);
