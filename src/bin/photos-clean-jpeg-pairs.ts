// Clean duplicate JPEG files from a photo folder.
//
// - Removes JPEG files when a matching RAW exists in the same folder
// - Removes .JPEG when a matching .JPG has the same file size
// - Logs .JPG/.JPEG pairs with different sizes for manual review
//
// Default folder: ~/Pictures/Photos
//
// - Clean duplicate JPEG files:
//
// `photos-clean-jpeg-pairs {{folder}}`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from '../util/args.ts';
import { dirs, exts, hasExtension, tildify, untildify } from '../util/files.ts';
import { findMediaFiles, getPhotoPairKey } from '../util/photos.ts';
import { prettyBytes } from '../util/prettyBytes.ts';
import { confirmYesNo } from '../util/prompt.ts';
import { run } from '../util/run.ts';
import { log } from '../util/theme.ts';

const args = parseArgs([
  {
    name: 'folder',
    positional: true,
  },
]);

interface ManualReviewItem {
  readonly reason: string;
  readonly files: readonly string[];
}

function groupByPairKey(filePaths: string[]): Map<string, string[]> {
  const byPairKey = new Map<string, string[]>();
  for (const filePath of filePaths) {
    const key = getPhotoPairKey(filePath);
    const group = byPairKey.get(key) ?? [];
    group.push(filePath);
    byPairKey.set(key, group);
  }
  return byPairKey;
}

function findJpegsWithRawPairs(filePaths: string[]): string[] {
  const toRemove: string[] = [];
  for (const group of groupByPairKey(filePaths).values()) {
    const hasRaw = group.some((filePath) => hasExtension(filePath, exts.raw));
    if (hasRaw === false) {
      continue;
    }

    for (const filePath of group) {
      if (hasExtension(filePath, exts.jpeg)) {
        toRemove.push(filePath);
      }
    }
  }

  return toRemove.toSorted((a, b) => a.localeCompare(b));
}

async function findJpgJpegDuplicateRemovals(
  filePaths: string[],
  alreadyRemoving: ReadonlySet<string>
): Promise<{ toRemove: string[]; needsReview: ManualReviewItem[] }> {
  const toRemove: string[] = [];
  const needsReview: ManualReviewItem[] = [];

  for (const group of groupByPairKey(filePaths).values()) {
    const hasRaw = group.some((filePath) => hasExtension(filePath, exts.raw));
    if (hasRaw) {
      continue;
    }

    const jpgFiles = group.filter(
      (filePath) =>
        path.extname(filePath).toLowerCase() === '.jpg' &&
        alreadyRemoving.has(filePath) === false
    );
    const jpegFiles = group.filter(
      (filePath) =>
        path.extname(filePath).toLowerCase() === '.jpeg' &&
        alreadyRemoving.has(filePath) === false
    );

    if (jpgFiles.length === 0 || jpegFiles.length === 0) {
      continue;
    }

    if (jpgFiles.length > 1 || jpegFiles.length > 1) {
      needsReview.push({
        reason: 'Multiple .jpg/.jpeg variants',
        files: [...jpgFiles, ...jpegFiles].toSorted((a, b) =>
          a.localeCompare(b)
        ),
      });
      continue;
    }

    const [jpgPath] = jpgFiles;
    const [jpegPath] = jpegFiles;
    const [jpgStats, jpegStats] = await Promise.all([
      fs.stat(jpgPath),
      fs.stat(jpegPath),
    ]);

    if (jpgStats.size === jpegStats.size) {
      toRemove.push(jpegPath);
      continue;
    }

    needsReview.push({
      reason: `Size mismatch (${prettyBytes(jpgStats.size)} vs ${prettyBytes(jpegStats.size)})`,
      files: [jpgPath, jpegPath],
    });
  }

  return {
    toRemove: toRemove.toSorted((a, b) => a.localeCompare(b)),
    needsReview,
  };
}

async function main(): Promise<void> {
  const photosRoot =
    args.folder === undefined
      ? dirs.photos
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
  const photoFiles = await findMediaFiles(photosRoot);
  const rawRemovals = findJpegsWithRawPairs(photoFiles);
  const rawRemovalSet = new Set(rawRemovals);
  const { toRemove: jpgJpegRemovals, needsReview } =
    await findJpgJpegDuplicateRemovals(photoFiles, rawRemovalSet);
  const toRemove = [...new Set([...rawRemovals, ...jpgJpegRemovals])].toSorted(
    (a, b) => a.localeCompare(b)
  );

  if (needsReview.length > 0) {
    console.log(`\nManual review needed (${needsReview.length}):`);
    for (const item of needsReview) {
      console.log(`  ${item.reason}:`);
      for (const filePath of item.files) {
        console.log(`    ${tildify(filePath)}`);
      }
    }
  }

  if (toRemove.length === 0) {
    if (needsReview.length === 0) {
      console.log('Nothing to clean.');
    }
    return;
  }

  if (rawRemovals.length > 0) {
    console.log(`\nFound ${rawRemovals.length} JPEG files with matching RAW:`);
    for (const filePath of rawRemovals) {
      console.log(`  ${filePath}`);
    }
  }

  if (jpgJpegRemovals.length > 0) {
    console.log(
      `\nFound ${jpgJpegRemovals.length} duplicate .JPEG files (same size as .JPG):`
    );
    for (const filePath of jpgJpegRemovals) {
      console.log(`  ${filePath}`);
    }
  }

  if ((await confirmYesNo(`Remove ${toRemove.length} files?`)) === false) {
    log.warn('Cancelled.');
    return;
  }

  for (const filePath of toRemove) {
    await fs.unlink(filePath);
  }

  console.log(`Removed ${toRemove.length} files.`);
}

await run(main);
