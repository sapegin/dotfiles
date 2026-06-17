// Remove JPEG files that have a matching RAW in the same folder.
//
// Usage: photos-clean-jpeg-pairs [folder]
//
// Default folder: ~/Pictures/Photos
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import {
  JPEG_EXTENSIONS,
  PHOTOS_ROOT,
  RAW_EXTENSIONS,
} from '../util/consts.ts';
import { parseArgs } from '../util/parseArgs.ts';
import { log } from '../util/theme.ts';
import { tildify, untildify } from '../util/tildify.ts';

const args = parseArgs([
  {
    name: 'folder',
    positional: true,
  },
]);

function pairKey(filePath: string): string {
  const basename = path.basename(filePath);
  const stem = basename.slice(0, -path.extname(basename).length).toLowerCase();
  return `${path.dirname(filePath)}/${stem}`;
}

async function findPhotoFiles(root: string): Promise<string[]> {
  const files = await Array.fromAsync(fs.glob('**/*', { cwd: root }));
  return files
    .filter((file) => {
      const basename = path.basename(file);
      return (
        basename.startsWith('.') === false &&
        basename.startsWith('._') === false &&
        basename !== '.DS_Store'
      );
    })
    .filter((file) => {
      const extension = path.extname(file).toLowerCase();
      return RAW_EXTENSIONS.has(extension) || JPEG_EXTENSIONS.has(extension);
    })
    .map((file) => path.join(root, file));
}

function findJpegsWithRawPairs(filePaths: string[]): string[] {
  const byPairKey = new Map<string, string[]>();
  for (const filePath of filePaths) {
    const key = pairKey(filePath);
    const group = byPairKey.get(key) ?? [];
    group.push(filePath);
    byPairKey.set(key, group);
  }

  const toRemove: string[] = [];
  for (const group of byPairKey.values()) {
    const hasRaw = group.some((filePath) =>
      RAW_EXTENSIONS.has(path.extname(filePath).toLowerCase())
    );
    if (hasRaw === false) {
      continue;
    }

    for (const filePath of group) {
      if (JPEG_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
        toRemove.push(filePath);
      }
    }
  }

  return toRemove.toSorted((a, b) => a.localeCompare(b));
}

async function confirmYesNo(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question(prompt);
  rl.close();
  const normalizedAnswer = answer.trim().toLowerCase();
  return normalizedAnswer === '' || normalizedAnswer === 'y';
}

async function main(): Promise<void> {
  const photosRoot =
    args.folder === undefined
      ? PHOTOS_ROOT
      : path.resolve(untildify(args.folder));

  try {
    const stats = await fs.stat(photosRoot);
    if (stats.isDirectory() === false) {
      log.warn(`Not a directory: ${photosRoot}`);
      process.exit(1);
    }
  } catch {
    log.warn(`Folder not found: ${photosRoot}`);
    process.exit(1);
  }

  console.log(`Scanning ${tildify(photosRoot)}…`);
  const photoFiles = await findPhotoFiles(photosRoot);
  const toRemove = findJpegsWithRawPairs(photoFiles);

  if (toRemove.length === 0) {
    console.log('No JPEG+RAW pairs found.');
    return;
  }

  console.log(`Found ${toRemove.length} JPEG files with matching RAW:`);
  for (const filePath of toRemove) {
    console.log(`  ${filePath}`);
  }

  if ((await confirmYesNo('Remove them? [Y/n] ')) === false) {
    log.warn('Cancelled.');
    return;
  }

  for (const filePath of toRemove) {
    await fs.unlink(filePath);
  }

  console.log(`Removed ${toRemove.length} files.`);
}

try {
  await main();
} catch (error) {
  log.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
