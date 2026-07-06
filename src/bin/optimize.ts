// Converts JPEG/PNG files to AVIF format. Keeps converted files only when they are at least 10 KB smaller than originals.
//
// - Optimize a specific image:
//
// `optimize {{file.jpg}}`
//
// - Optimize images matching a glob pattern:
//
// `optimize "{{*.png}}"`
//
// - Force-optimize an image (will overwrite if already optimized and save the file even if the difference is less than 10 KB):
//
// `optimize {{file.png}} --force`
//
// - Change AVIF quality:
//
// `optimize "{{*.jpg}}" --quality 60`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { parseArgs } from '../util/args.ts';
import { prettyBytes } from '../util/files.ts';
import { run, theme } from '../util/tui.ts';

const EFFORT_LEVEL = 8;
const MINIMUM_SAVINGS_BYTES = 10 * 1024;

const args = parseArgs([
  {
    name: 'pattern',
    positional: true,
    required: true,
  },
  {
    name: 'force',
    type: 'boolean',
    default: false,
  },
  {
    name: 'quality',
    type: 'number',
    alias: 'q',
    min: 1,
    max: 100,
    default: 50,
  },
]);

function getAvifPath(filePath: string): string {
  const directory = path.dirname(filePath);
  const extension = path.extname(filePath);
  const filenameWithoutExtension = path.basename(filePath, extension);
  return path.join(directory, `${filenameWithoutExtension}.avif`);
}

function formatSizeDiff(
  difference: number,
  originalSize: number,
  optimizedSize: number
) {
  const ratio = `${((optimizedSize * 100) / originalSize).toFixed(2)}%`;
  return difference >= 0
    ? theme.success(`(-${prettyBytes(difference)}, ${ratio})`)
    : theme.error(`(+${prettyBytes(Math.abs(difference))}, ${ratio})`);
}

async function convertFile(
  filePath: string,
  force: boolean,
  quality: number
): Promise<void> {
  const avifPath = getAvifPath(filePath);

  if (force === false) {
    try {
      await fs.access(avifPath);
      return;
    } catch {
      // Convert when the AVIF file does not exist.
    }
  }

  const { size: originalSize } = await fs.stat(filePath);

  await sharp(filePath)
    .avif({ quality, effort: EFFORT_LEVEL })
    .toFile(avifPath);

  const { size: avifSize } = await fs.stat(avifPath);
  const difference = originalSize - avifSize;

  if (difference > MINIMUM_SAVINGS_BYTES || force) {
    console.log(
      `${theme.strong(filePath)}: ${prettyBytes(originalSize)} → ${theme.info(prettyBytes(avifSize))} ${formatSizeDiff(difference, originalSize, avifSize)}`
    );
  } else {
    console.log(
      `${theme.strong(filePath)}: skipped, AVIF is larger ${prettyBytes(originalSize)} → ${theme.info(prettyBytes(avifSize))} ${formatSizeDiff(difference, originalSize, avifSize)}`
    );
    await fs.rm(avifPath);
  }
}

async function main(): Promise<void> {
  const files = await Array.fromAsync(fs.glob(args.pattern));
  for (const imagePath of files) {
    await convertFile(imagePath, args.force, args.quality);
  }
}

await run(main);
