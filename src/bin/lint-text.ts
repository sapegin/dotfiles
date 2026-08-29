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
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { dirs, untildify } from '../util/files.ts';
import { run } from '../util/tui.ts';

const OPTIONS = [{ name: 'args', rest: true }] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

export function lintText({ args }: Options): void {
  const result = spawnSync(
    path.join(dirs.dotfiles, 'node_modules/.bin/textlint'),
    [
      '--config',
      path.join(dirs.dotfiles, 'textlint/textlint.config.cjs'),
      ...args.map(untildify),
    ],
    {
      // Run in the caller’s directory so relative file globs are resolved against
      // it instead of the dotfiles repository.
      cwd: process.cwd(),
      stdio: 'inherit',
    }
  );

  if (result.error !== undefined) {
    throw result.error;
  }

  process.exit(result.status ?? 1);
}

await run(import.meta.url, () => lintText(parseArgs(OPTIONS)));
