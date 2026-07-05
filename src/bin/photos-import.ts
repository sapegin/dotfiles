// Import photos from a camera memory card into ~/Pictures/Photos.
//
// - Detects a mounted card
// - Prefers RAW over JPEG pairs
// - Copies and renames each new file
// - Copies files to NAS backup folder
// - Skips already imported files by matching number suffixes and capture dates
// - Ejects the card when done and opens copied photos in Photomator
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readExifMetadata } from '../util/exif.ts';
import { copyFile, dirs, getCommonFolder, tildify } from '../util/files.ts';
import { ensureVolumeMounted } from '../util/mount.ts';
import {
  dedupeRawJpegPairs,
  findMediaFiles,
  getDatedPhotoFilename,
  getPhotoFilenameDate,
  getPhotoFolders,
  getPhotoFilenameSuffix,
  pickPhotoFolder,
} from '../util/photos.ts';
import { confirmYesNo } from '../util/prompt.ts';
import { run } from '../util/run.ts';
import { createProgress, log } from '../util/tui.ts';

const VOLUMES_DIR = '/Volumes';
const OFFSITE_BACKUP_DIR = path.join(dirs.nasPhotos, 'Backup');

/**
 * Check whether two import dates are close enough to be the same capture.
 *
 * Two shots must be within 24 hours from each other to be considered the same
 * day. This accommodates to time zone adjustment of files that are already
 * imported vs. files that are about to be imported.
 */
function datesWithinDay(dateA: string, dateB: string): boolean {
  const day = 1000 * 60 * 60 * 24;
  const timeA = new Date(`${dateA}T12:00:00`).getTime();
  const timeB = new Date(`${dateB}T12:00:00`).getTime();
  return Math.round(Math.abs(timeA - timeB) / day) <= 1;
}

/**
 * Find mounted volumes that look like camera cards.
 *
 * Returns all mounted volumes that have DCIM folder.
 */
async function findCardVolumes(): Promise<string[]> {
  const volumes: string[] = [];
  for (const entry of await fs.readdir(VOLUMES_DIR, { withFileTypes: true })) {
    if (entry.isDirectory() === false) {
      continue;
    }
    const volumePath = path.join(VOLUMES_DIR, entry.name);
    try {
      await fs.access(path.join(volumePath, 'DCIM'));
      volumes.push(volumePath);
    } catch {
      // Not a camera card
    }
  }
  return volumes;
}
/** Decide whether suffix and date matches mean the card file is imported. */
function isAlreadyImported(
  cardDate: string | undefined,
  libraryDates: (string | undefined)[]
): boolean {
  for (const libraryDate of libraryDates) {
    // Library file has no date in its name — suffix match is enough.
    if (libraryDate === undefined) {
      return true;
    }
    // Library file has a date — suffix and date must match.
    if (cardDate !== undefined && datesWithinDay(libraryDate, cardDate)) {
      return true;
    }
  }
  return false;
}

/** Filter card files down to photos missing from the local library. */
async function findPhotosToImport(cardPaths: string[]): Promise<string[]> {
  // 1. Index library filenames by suffix (date from filename, if present).
  const libraryBySuffix = new Map<string, (string | undefined)[]>();
  for (const folder of await getPhotoFolders()) {
    for (const filename of await Array.fromAsync(
      fs.glob('*', { cwd: path.join(dirs.photos, folder) })
    )) {
      const suffix = getPhotoFilenameSuffix(filename);
      if (suffix === undefined) {
        continue;
      }
      const dates = libraryBySuffix.get(suffix) ?? [];
      dates.push(getPhotoFilenameDate(filename));
      libraryBySuffix.set(suffix, dates);
    }
  }

  // 2. For each card file, look up library entries with the same suffix.
  const toImport: string[] = [];
  for (const sourcePath of cardPaths) {
    const suffix = getPhotoFilenameSuffix(path.basename(sourcePath));
    if (suffix === undefined) {
      continue;
    }

    const libraryDates = libraryBySuffix.get(suffix);
    if (libraryDates === undefined) {
      toImport.push(sourcePath);
      continue;
    }

    const hasDatedImports = libraryDates.some((date) => date !== undefined);
    const cardDate = hasDatedImports
      ? // oxlint-disable-next-line unicorn/no-await-expression-member
        (await readExifMetadata(sourcePath)).date
      : undefined;

    // 3. Skip when suffix (and date, if available) match a library import.
    if (isAlreadyImported(cardDate, libraryDates) === false) {
      toImport.push(sourcePath);
    }
  }

  return toImport;
}

/** Copy one card file locally, rename it, and mirror it to the NAS. */
async function importPhoto(
  sourcePath: string,
  tempPath: string,
  destinationDir: string
): Promise<string | undefined> {
  await copyFile(sourcePath, tempPath);

  const { date, year } = await readExifMetadata(sourcePath);
  if (!year) {
    log.warn(`Cannot get capture date for: ${sourcePath}`);
  }

  const destinationPath = path.join(
    destinationDir,
    year ? getDatedPhotoFilename(sourcePath, year, date) : sourcePath
  );

  try {
    await fs.stat(destinationPath);
    await fs.unlink(tempPath);
    return undefined;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const backupPath = path.join(
    OFFSITE_BACKUP_DIR,
    path.relative(dirs.photos, destinationDir),
    path.basename(destinationPath)
  );

  await fs.rename(tempPath, destinationPath);
  try {
    await copyFile(destinationPath, backupPath);
  } catch (error) {
    // Remove both (destination and backup) files like it never happened, so the
    // user can try to import the file again
    await fs.rm(destinationPath, { force: true });
    await fs.rm(backupPath, { force: true });
    throw error;
  }
  return path.basename(destinationPath);
}

/** Eject the camera card after a successful or empty import. */
function ejectCard(cardVolume: string): void {
  console.log(`Ejecting ${cardVolume}…`);
  execSync(`diskutil eject ${JSON.stringify(cardVolume)}`, {
    stdio: 'inherit',
  });
}

/** Run the interactive camera card import flow. */
async function main(): Promise<void> {
  ensureVolumeMounted(dirs.nasPhotos);

  console.log('Looking for card…');
  const cardVolumes = await findCardVolumes();
  if (cardVolumes.length === 0) {
    log.warn('No card found. Insert a card and try again.');
    process.exit(1);
  }

  const [cardVolume] = cardVolumes;

  console.log(`Scanning ${cardVolume}…`);
  const photos = dedupeRawJpegPairs(
    await findMediaFiles(path.join(cardVolume, 'DCIM'))
  ).flatMap((sourcePath): string[] => {
    if (getPhotoFilenameSuffix(path.basename(sourcePath)) === undefined) {
      log.warn(
        `Skipping ${path.basename(sourcePath)}: cannot determine number suffix`
      );
      return [];
    }
    return [sourcePath];
  });

  if (photos.length === 0) {
    log.warn(`No photos found on ${cardVolume}.`);
    process.exit(1);
  }

  console.log(`Checking duplicates for ${photos.length} photos…`);
  const toImport = await findPhotosToImport(photos);
  const skipped = photos.length - toImport.length;

  if (skipped > 0) {
    console.log(`Skipping ${skipped} already imported.`);
  }

  if (toImport.length === 0) {
    if ((await confirmYesNo('Eject card?', true)) === false) {
      log.warn('Import cancelled.');
      process.exit(1);
    }
    ejectCard(cardVolume);
    return;
  }

  const sourceFolder = getCommonFolder(photos);
  execFileSync('open', [sourceFolder]);
  console.log(`Importing from ${sourceFolder}…`);

  const destinationDir = await pickPhotoFolder({
    prompt: 'Destination folder',
    allowNewFolder: true,
  });
  if (destinationDir === undefined) {
    process.exit(1);
  }

  await fs.mkdir(destinationDir, { recursive: true });

  console.log();
  if (
    (await confirmYesNo(
      `Import ${toImport.length} photos to ${tildify(destinationDir)}?`,
      true
    )) === false
  ) {
    log.warn('Import cancelled.');
    process.exit(1);
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'photos-import-'));
  const failures: string[] = [];
  let importedCount = 0;
  let skippedInFolder = 0;
  const progress = createProgress({ total: toImport.length });

  try {
    for (const [index, sourcePath] of toImport.entries()) {
      const current = index + 1;
      const tempPath = path.join(
        tempDir,
        `${String(index).padStart(4, '0')}_${path.basename(sourcePath)}`
      );

      try {
        const importedName = await importPhoto(
          sourcePath,
          tempPath,
          destinationDir
        );
        if (importedName === undefined) {
          skippedInFolder++;
          progress.update(
            current,
            `${path.basename(sourcePath)} — already in folder`
          );
          continue;
        }

        importedCount++;
        progress.update(
          current,
          `${path.basename(sourcePath)} → ${importedName}`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(message);
        progress.error(
          `Failed to import ${path.basename(sourcePath)}: ${message}`
        );
      }
    }
  } finally {
    progress.done();
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    log.warn(
      `${failures.length} files failed to import; card was not ejected.`
    );
    process.exit(1);
  }

  if (skippedInFolder > 0) {
    console.log(`Skipped ${skippedInFolder} already in folder.`);
  }

  if (importedCount === 0) {
    console.log('Nothing imported.');
    if ((await confirmYesNo('Eject card?', true)) === false) {
      log.warn('Import cancelled.');
      process.exit(1);
    }
    ejectCard(cardVolume);
    return;
  }

  ejectCard(cardVolume);

  try {
    execFileSync('open', ['-a', 'Photomator', destinationDir], {
      stdio: 'inherit',
    });
  } catch {
    log.warn('Could not open Photomator.');
  }
}

await run(main);
