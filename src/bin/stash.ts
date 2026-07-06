// Stashes all changes (including untracked), or runs `git stash` with all arguments.
//
// - Stash all changes:
//
// `stash`
//
// ---
// Based on git-friendly:
// https://github.com/git-friendly/git-friendly
//
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);

try {
  if (args.length === 0) {
    console.log(' Stashing changes…');
    execFileSync('git', ['stash', '--include-untracked'], { stdio: 'inherit' });
  } else {
    execFileSync('git', ['stash', ...args], { stdio: 'inherit' });
  }
} catch (error) {
  // Git already prints helpful output (including conflicts) to the terminal, so
  // exit with its status code instead of throwing a Node stack trace.
  process.exit(
    typeof error === 'object' && error !== null && 'status' in error
      ? Number(error.status)
      : 1
  );
}
