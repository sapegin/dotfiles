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
import { parseArgs } from '../util/args.ts';
import { prettyBytes } from '../util/prettyBytes.ts';

const args = parseArgs([
  {
    name: 'file',
    positional: true,
    required: true,
  },
]);

const originalSize = fs.statSync(args.file).size;
const gzipOutput = execFileSync('gzip', ['-c', args.file]);
const gzipSize = gzipOutput.length;
const ratio = (gzipSize * 100) / originalSize;

console.log(`Original: ${prettyBytes(originalSize)}`);
console.log(`Gzipped:  ${prettyBytes(gzipSize)} (${ratio.toFixed(2)}%)`);
