// Initializes Git repository: creates a repository and commits all files.
//
// ---
// Based on https://github.com/tj/git-extras/blob/master/bin/git-setup
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { parseArgs } from '../util/args.ts';

const args = parseArgs([
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
]);

if (args.dir !== '.') {
  fs.mkdirSync(args.dir, { recursive: true });
  process.chdir(args.dir);
}

if (fs.existsSync('.git')) {
  console.error('.git directory already exists, aborting');
  process.exit(1);
}

execFileSync('git', ['init'], { stdio: 'inherit' });
execFileSync('git', ['add', '.'], { stdio: 'inherit' });
execFileSync('git', ['commit', '--allow-empty', '-m', args.message], {
  stdio: 'inherit',
});
