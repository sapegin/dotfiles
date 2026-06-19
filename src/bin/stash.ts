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

if (args.length === 0) {
  console.log('🐿️ Stashing changes…');
  execFileSync('git', ['stash', '--include-untracked'], { stdio: 'inherit' });
} else {
  execFileSync('git', ['stash', ...args], { stdio: 'inherit' });
}
