// Initializes Git repository: creates a repository and commits all files.
//
// ---
// Based on https://github.com/tj/git-extras/blob/master/bin/git-setup
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { run } from '../util/tui.ts';

const OPTIONS = [
  {
    name: 'message',
    alias: 'm',
    default: 'Initial commit',
  },
  {
    name: 'dir',
    positional: true,
    default: '.',
  },
] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

export function gitSetup({ message, dir }: Options): void {
  if (dir !== '.') {
    fs.mkdirSync(dir, { recursive: true });
    process.chdir(dir);
  }

  if (fs.existsSync('.git')) {
    console.error('.git directory already exists, aborting');
    process.exit(1);
  }

  execFileSync('git', ['init'], { stdio: 'inherit' });
  execFileSync('git', ['add', '.'], { stdio: 'inherit' });
  execFileSync('git', ['commit', '--allow-empty', '-m', message], {
    stdio: 'inherit',
  });
}

await run(import.meta.url, () => gitSetup(parseArgs(OPTIONS)));
