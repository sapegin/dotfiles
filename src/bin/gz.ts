// Compares original and gzipped file sizes.
//
// - Compare sizes:
//
// `gz {{file}}`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { prettyBytes } from '../util/files.ts';
import { run } from '../util/tui.ts';

const OPTIONS = [
  {
    name: 'file',
    positional: true,
    required: true,
  },
] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

export function gz({ file }: Options): void {
  const originalSize = fs.statSync(file).size;
  const gzipOutput = execFileSync('gzip', ['-c', file]);
  const gzipSize = gzipOutput.length;
  const ratio = (gzipSize * 100) / originalSize;

  console.log(`Original: ${prettyBytes(originalSize)}`);
  console.log(`Gzipped:  ${prettyBytes(gzipSize)} (${ratio.toFixed(2)}%)`);
}

await run(import.meta.url, () => gz(parseArgs(OPTIONS)));
