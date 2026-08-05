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

import { execFileSync, execSync } from 'node:child_process';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
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
  if (force === false) {
    const branches = getStaleBranches();
    for (const branch of branches) {
      console.log(branch);
    }
    process.exit(1);
  }

  log.heading('\nDeleting unreachable objects…\n');
  execFileSync('git', ['prune'], { stdio: 'inherit' });

  log.heading('\nDeleting stale remote-tracking branches…\n');
  execFileSync('git', ['remote', 'prune', 'origin'], { stdio: 'inherit' });
  console.log('Done.');

  log.heading('\nDeleting branches with no longer existing remote branches…\n');
  const staleBranches = getStaleBranches();
  if (staleBranches.length > 0) {
    execFileSync('git', ['branch', '-D', ...staleBranches], { stdio: 'inherit' });
  }
}

await run(import.meta.url, () => gitCleanup(parseArgs(OPTIONS)));
