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

import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { runGit } from '../util/git.ts';
import { run } from '../util/tui.ts';

const OPTIONS = [{ name: 'args', rest: true }] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

export function stash({ args }: Options): void {
  if (args.length === 0) {
    console.log(' Stashing changes…');
    runGit(['stash', '--include-untracked']);
  } else {
    runGit(['stash', ...args]);
  }
}

await run(import.meta.url, () => stash(parseArgs(OPTIONS)));
