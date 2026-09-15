// Removes old Git branches and does other cleanup.
//
// - Dry run (print branches to remove, don't actually remove them):
//
// `git-cleanup`
//
// - Run cleanup:
//
// `git-cleanup --force`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execSync } from 'node:child_process';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { assertGitRepo, runGit } from '../util/git.ts';
import { log, run } from '../util/tui.ts';

function getStaleBranches(): string[] {
  const output = execSync('git branch -vv', { encoding: 'utf8' });
  return output
    .split('\n')
    .filter((line) => line.includes('origin/') && line.includes(': gone]'))
    .map((line) => line.trim().split(/\s+/)[0] ?? '')
    .filter(Boolean);
}

const OPTIONS = [
  {
    name: 'force',
    type: 'boolean',
    default: false,
  },
] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

export function gitCleanup({ force }: Options): void {
  assertGitRepo();

  if (force === false) {
    const branches = getStaleBranches();
    for (const branch of branches) {
      console.log(branch);
    }
    process.exit(1);
  }

  log.heading('\nDeleting unreachable objects…\n');
  runGit(['prune']);

  log.heading('\nDeleting stale remote-tracking branches…\n');
  runGit(['remote', 'prune', 'origin']);
  console.log('Done.');

  log.heading('\nDeleting branches with no longer existing remote branches…\n');
  const staleBranches = getStaleBranches();
  if (staleBranches.length > 0) {
    runGit(['branch', '-D', ...staleBranches]);
  }
}

await run(import.meta.url, () => gitCleanup(parseArgs(OPTIONS)));
