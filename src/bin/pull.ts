// Pulls remote changes using rebase and tries to rebundle,
// safely stashing and re-applying your local changes, if any.
//
// - Pull remote changes:
//
// `pull`
//
// ---
// Based on git-friendly:
// https://github.com/git-friendly/git-friendly
//
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { assertGitRepo, getCurrentBranch, getGitConfig } from '../util/git.ts';
import { log } from '../util/tui.ts';

// TODO: We can just assume it's installed if the project uses it
function commandExists(cmd: string): boolean {
  try {
    execSync(`command -v ${cmd}`, { shell: '/bin/bash', stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getBaseDir(): string {
  return execSync('git rev-parse --show-cdup', { encoding: 'utf8' }).trim();
}

function fileExistsInRepo(filename: string): boolean {
  return fs.existsSync(path.join(process.cwd(), getBaseDir(), filename));
}

function getChangedFiles(): string[] {
  try {
    return execSync(
      'git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD',
      { encoding: 'utf8' }
    )
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

function hasChanged(filename: string): boolean {
  return getChangedFiles().some((f) => f.includes(filename));
}

assertGitRepo();

const branch = getCurrentBranch();

if (branch === undefined) {
  log.error(
    "✕ You're not on a branch (detached HEAD). Check out a branch first."
  );
  process.exit(1);
}

const remote = getGitConfig(`branch.${branch}.remote`) ?? 'origin';
const mergeRef =
  getGitConfig(`branch.${branch}.merge`) ?? `refs/heads/${branch}`;
const remoteBranch = mergeRef.split('/').slice(2).join('/');

// Stash local changes including untracked; compare refs/stash before/after to
// detect whether anything was actually stashed (more robust than parsing output)
const stashBefore = execSync(
  'git rev-parse --verify --quiet refs/stash || true',
  {
    shell: '/bin/bash',
    encoding: 'utf8',
  }
).trim();

execFileSync('git', ['stash', '--include-untracked'], { stdio: 'inherit' });

const stashAfter = execSync(
  'git rev-parse --verify --quiet refs/stash || true',
  {
    shell: '/bin/bash',
    encoding: 'utf8',
  }
).trim();

const stashed = stashBefore !== stashAfter;

function unstash(): void {
  if (stashed) {
    console.log('󰦛 Restoring tree from stash…');
    execFileSync('git', ['stash', 'pop'], { stdio: 'inherit' });
  }
}

function rollback(exitCode: number): never {
  console.log();
  log.error('Something went wrong, rolling back…');
  unstash();
  process.exit(exitCode);
}

// Pull with rebase
console.log(`↓ Fetching from ${remote}…`);
try {
  execFileSync(
    'git',
    [
      'pull',
      '--rebase',
      '--prune',
      '--recurse-submodules',
      '--jobs=10',
      remote,
      remoteBranch,
    ],
    { stdio: 'inherit' }
  );
} catch {
  rollback(1);
}

unstash();

// Install Node.js packages with pnpm if available, otherwise fall back to npm
if (
  commandExists('pnpm') &&
  fileExistsInRepo('pnpm-lock.yaml') &&
  (hasChanged('pnpm-lock.yaml') || hasChanged('package.json'))
) {
  console.log();
  console.log(' Installing packages with pnpm…');
  const lockFile = getChangedFiles().find((f) => f.includes('pnpm-lock.yaml'));
  const packageFile = getChangedFiles().find((f) => f.includes('package.json'));
  const changedFile = lockFile ?? packageFile;
  const installDir = changedFile
    ? path.join(process.cwd(), getBaseDir(), path.dirname(changedFile))
    : process.cwd();
  execFileSync('pnpm', ['install'], { stdio: 'inherit', cwd: installDir });
} else if (commandExists('npm') && hasChanged('package.json')) {
  console.log();
  console.log(' Installing packages with npm…');
  const packageFile = getChangedFiles().find((f) => f.includes('package.json'));
  const installDir = packageFile
    ? path.join(process.cwd(), getBaseDir(), path.dirname(packageFile))
    : process.cwd();
  execFileSync('npm', ['install'], { stdio: 'inherit', cwd: installDir });
}
