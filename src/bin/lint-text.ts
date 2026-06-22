// Lint text with the local textlint configuration and preset.
//
// Usage:
//   lint-text README.md
//   lint-text --fix README.md
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { dirs } from '../util/consts.ts';

const result = spawnSync(
  path.join(dirs.dotfiles, 'node_modules/.bin/textlint'),
  ['--config', 'textlint/textlint.config.cjs', ...process.argv.slice(2)],
  {
    cwd: dirs.dotfiles,
    stdio: 'inherit',
  }
);

if (result.error !== undefined) {
  throw result.error;
}

process.exit(result.status ?? 1);
