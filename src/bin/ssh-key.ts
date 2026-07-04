// Prints public SSH key, generates it if necessary.
//
// - Print a key:
//
// `ssh-key`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { dirs } from '../util/files.ts';

const keyFile = path.join(dirs.home, '.ssh', 'id_rsa');

if (!fs.existsSync(keyFile)) {
  execFileSync('ssh-keygen', ['-t', 'rsa', '-f', keyFile, '-q', '-P', ''], {
    stdio: 'inherit',
  });
}

process.stdout.write(fs.readFileSync(`${keyFile}.pub`, 'utf8'));
