// Adjust photo EXIF dates from the camera's Berlin clock to another timezone.
//
// - Choose target timezone with fzf
// - Choose a folder inside ~/Pictures/Photos with fzf
// - Applies per-photo DST-aware shifts with exiftool
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readExifMetadata } from '../util/exif.ts';
import { tildify } from '../util/files.ts';
import { findMediaFiles, pickPhotoFolder } from '../util/photos.ts';
import { run } from '../util/run.ts';
import { getPhotoTimezoneShiftMinutes, getTimeZones } from '../util/time.ts';
import { confirm, log, select } from '../util/tui.ts';

const execFileAsync = promisify(execFile);
const BATCH_SIZE = 100;

interface PhotoShift {
  readonly filePath: string;
  readonly shiftMinutes: number;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function groupByShift(
  photoShifts: readonly PhotoShift[]
): Map<number, string[]> {
  const byShift = new Map<number, string[]>();
  for (const photoShift of photoShifts) {
    const files = byShift.get(photoShift.shiftMinutes) ?? [];
    files.push(photoShift.filePath);
    byShift.set(photoShift.shiftMinutes, files);
  }
  return byShift;
}

function formatShift(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const absoluteMinutes = Math.abs(minutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const remainingMinutes = absoluteMinutes % 60;
  return `${sign}${hours}h${remainingMinutes === 0 ? '' : ` ${remainingMinutes}m`}`;
}

function formatExifToolShift(minutes: number): string {
  const absoluteMinutes = Math.abs(minutes);
  const days = Math.floor(absoluteMinutes / 1440);
  const hours = Math.floor((absoluteMinutes % 1440) / 60);
  const remainingMinutes = absoluteMinutes % 60;
  return `0:0:${days} ${hours}:${remainingMinutes}:0`;
}

async function applyShift(
  shiftMinutes: number,
  filePaths: readonly string[]
): Promise<void> {
  const operator = shiftMinutes < 0 ? '-=' : '+=';
  const shift = formatExifToolShift(shiftMinutes);
  for (const fileBatch of chunk(filePaths, BATCH_SIZE)) {
    await execFileAsync('exiftool', [
      '-overwrite_original',
      `-AllDates${operator}${shift}`,
      `-FileModifyDate${operator}${shift}`,
      ...fileBatch,
    ]);
  }
}

async function main(): Promise<void> {
  const targetTimeZone = select(getTimeZones(), 'Target timezone');
  if (targetTimeZone === undefined) {
    log.warn('Cancelled.');
    return;
  }

  const photoFolder = await pickPhotoFolder();
  if (photoFolder === undefined) {
    log.warn('No photo folder selected.');
    return;
  }

  console.log(`Scanning ${tildify(photoFolder)}…`);
  const photoFiles = await findMediaFiles(photoFolder);
  if (photoFiles.length === 0) {
    console.log('No photo files found.');
    return;
  }

  const photoShifts: PhotoShift[] = [];
  const skippedFiles: string[] = [];

  for (const filePath of photoFiles) {
    const metadata = await readExifMetadata(filePath);
    const shiftMinutes =
      metadata.dateParts === undefined
        ? undefined
        : getPhotoTimezoneShiftMinutes(metadata.dateParts, targetTimeZone);

    if (shiftMinutes === undefined) {
      skippedFiles.push(filePath);
      continue;
    }
    if (shiftMinutes !== 0) {
      photoShifts.push({ filePath, shiftMinutes });
    }
  }

  if (photoShifts.length === 0) {
    console.log('No date adjustments needed.');
    if (skippedFiles.length > 0) {
      console.log(
        `Skipped ${skippedFiles.length} files without usable EXIF dates.`
      );
    }
    return;
  }

  const byShift = groupByShift(photoShifts);
  console.log(`\nTarget timezone: ${targetTimeZone}`);
  console.log(`Folder: ${tildify(photoFolder)}`);
  console.log(`Files to adjust: ${photoShifts.length}`);
  if (skippedFiles.length > 0) {
    console.log(
      `Skipped: ${skippedFiles.length} files without usable EXIF dates`
    );
  }
  console.log('\nShifts:');
  for (const [shiftMinutes, files] of [...byShift.entries()].toSorted(
    ([shiftA], [shiftB]) => shiftA - shiftB
  )) {
    console.log(`  ${formatShift(shiftMinutes)}: ${files.length} files`);
  }

  if ((await confirm('\nApply these EXIF date adjustments?')) === false) {
    log.warn('Cancelled.');
    return;
  }

  for (const [shiftMinutes, files] of byShift) {
    console.log(
      `Applying ${formatShift(shiftMinutes)} to ${files.length} files…`
    );
    await applyShift(shiftMinutes, files);
  }

  console.log(`Adjusted ${photoShifts.length} files.`);
}

await run(main);
