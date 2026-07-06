// Changes Git branch and pulls remote changes.
//
// - Switch to or create a branch:
//
// `br {{branch}}`
//
// - Switch to a previous branch:
//
// `br -`
//
// - Delete a local fully merged branch:
//
// `br -d {{branch}}`
//
// - Delete a local not fully merged branch:
//
// `br -D {{branch}}`
//
// ---
// Based on git-friendly:
// https://github.com/git-friendly/git-friendly
//
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execFileSync, execSync, spawnSync } from 'node:child_process';
import { parseArgs } from '../util/args.ts';
import { getUpstreamTracking, runPull } from '../util/git.ts';
import { select } from '../util/tui.ts';

const remote = 'origin';

// Lists local branches sorted by most recently updated first.
function getLocalBranches(): string[] {
  return execFileSync(
    'git',
    [
      'for-each-ref',
      '--sort=-committerdate',
      'refs/heads/',
      '--format=%(refname:short)',
    ],
    { encoding: 'utf8' }
  )
    .split('\n')
    .filter((line) => line.length > 0);
}

function hasLocalBranch(name: string): boolean {
  return (
    spawnSync('git', ['show-ref', '--verify', '--quiet', `refs/heads/${name}`])
      .status === 0
  );
}

function hasRemoteBranch(name: string): boolean {
  return (
    spawnSync('git', [
      'show-ref',
      '--verify',
      '--quiet',
      `refs/remotes/${remote}/${name}`,
    ]).status === 0
  );
}

function tryPull(branch: string): void {
  if (hasRemoteBranch(branch)) {
    runPull();
  }
}

const args = parseArgs([
  {
    name: 'delete',
    alias: 'd',
    type: 'boolean',
  },
  {
    // HACK: In `git branch` it's actually `--delete --force` but we'll roll with
    // this for now
    name: 'forceDelete',
    alias: 'D',
    type: 'boolean',
  },
  {
    name: 'branch',
    positional: true,
  },
]);

// oxlint-disable-next-line unicorn/no-nested-ternary
const deleteFlag = args.forceDelete ? '-D' : args.delete ? '-d' : undefined;

// No branch given — let the user pick one from the local branches
let branch = args.branch;
if (branch === undefined) {
  const branches = getLocalBranches();
  const selected = select(branches, 'Switch to branch:');
  if (selected === undefined) {
    process.exit(0);
  }
  branch = selected;
}

// Switch to a previous branch
if (branch === '-') {
  execFileSync('git', ['switch', '-'], { stdio: 'inherit' });
  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
    encoding: 'utf8',
  }).trim();
  tryPull(currentBranch);
  process.exit(0);
}

// Attempt to use main when master was requested (and vice versa)
if (branch === 'master' && hasLocalBranch('main')) {
  execFileSync('git', ['switch', 'main'], { stdio: 'inherit' });
  console.log('This repository uses main branch, not master');
  tryPull('main');
  process.exit(0);
}
if (branch === 'main' && hasLocalBranch('master')) {
  execFileSync('git', ['switch', 'master'], { stdio: 'inherit' });
  console.log('This repository uses master branch, not main');
  tryPull('master');
  process.exit(0);
}

// Delete branch
if (deleteFlag !== undefined) {
  console.log(`✕ Removing local branch ${branch}…`);
  execFileSync('git', ['branch', deleteFlag, branch], { stdio: 'inherit' });
  process.exit(0);
}

if (hasLocalBranch(branch)) {
  // Local branch exists — switch to it
  console.log(` Switching to existing local branch ${branch}…`);
  execFileSync('git', ['switch', branch], { stdio: 'inherit' });

  if (hasRemoteBranch(branch)) {
    // Fix tracking if needed
    const tracking = getUpstreamTracking(branch);

    if (!tracking?.startsWith(`${remote}/`)) {
      console.log(
        '⚙ Your local branch is not tracking the corresponding remote branch, fixing…'
      );
      execFileSync(
        'git',
        ['branch', '--set-upstream-to', `${remote}/${branch}`, branch],
        { stdio: 'inherit' }
      );
    }
  }

  tryPull(branch);
} else if (hasRemoteBranch(branch)) {
  // No local branch, but remote exists — fetch and switch
  console.log(`↓ Fetching remote branch ${branch}…`);
  execFileSync('git', ['fetch', remote, branch], { stdio: 'inherit' });
  console.log();
  execFileSync(
    'git',
    ['switch', '-c', branch, '--track', `${remote}/${branch}`],
    {
      stdio: 'inherit',
    }
  );
} else {
  // No local or remote branch — create a new one
  console.log(`+ Creating new local branch ${branch}…`);
  execFileSync('git', ['switch', '-c', branch, '--no-track'], {
    stdio: 'inherit',
  });
}
