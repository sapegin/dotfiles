// Import photos from a camera memory card into ~/Pictures/Photos.
//
// - Detects a mounted card
// - Prefers RAW over JPEG pairs
// - Detects duplicates by matching number suffixes and capture dates
// - Copies and renames each new file
// - Skips files that already exist in the destination folder
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
import readline from 'node:readline/promises';
import {
  dirs,
  JPEG_EXTENSIONS,
  RAW_EXTENSIONS,
} from '../util/consts.ts';
import { readExifMetadata } from '../util/exiftool.ts';
import { run } from '../util/run.ts';
import { log } from '../util/theme.ts';
import { tildify } from '../util/tildify.ts';

const VOLUMES_DIR = '/Volumes';
const NEW_FOLDER_OPTION = '+ New folder…';

const MEDIA_EXTENSIONS = new Set([
  ...RAW_EXTENSIONS,
  ...JPEG_EXTENSIONS,
  '.heic',
  '.tif',
  '.tiff',
  '.png',
  '.mov',
  '.mp4',
  '.m4v',
  '.avi',
]);
const IMPORT_DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})_/;

function getImportDate(filename: string): string | undefined {
  return path.basename(filename).match(IMPORT_DATE_PREFIX)?.[1];
}

function getSuffix(filename: string): string | undefined {
  const stem = path
    .basename(filename, path.extname(filename))
    .replace(IMPORT_DATE_PREFIX, '');
  return stem.match(/^(\d+)/)?.[1] ?? stem.match(/(\d+)$/)?.[1];
}

function datesWithinDay(dateA: string, dateB: string): boolean {
  const day = 1000 * 60 * 60 * 24;
  const timeA = new Date(`${dateA}T12:00:00`).getTime();
  const timeB = new Date(`${dateB}T12:00:00`).getTime();
  return Math.round(Math.abs(timeA - timeB) / day) <= 1;
}

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

async function findMediaFiles(dcimRoot: string): Promise<string[]> {
  const files = await Array.fromAsync(fs.glob('**/*', { cwd: dcimRoot }));
  return files
    .filter((file) => {
      const basename = path.basename(file);
      return (
        basename.startsWith('.') === false &&
        basename.startsWith('._') === false &&
        basename !== '.DS_Store'
      );
    })
    .filter((file) => MEDIA_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .map((file) => path.join(dcimRoot, file));
}

function dedupeRawJpegPairs(filePaths: string[]): string[] {
  const byStem = new Map<string, string[]>();
  for (const filePath of filePaths) {
    const basename = path.basename(filePath);
    const stem = basename
      .slice(0, -path.extname(basename).length)
      .toLowerCase();
    const group = byStem.get(stem) ?? [];
    group.push(filePath);
    byStem.set(stem, group);
  }

  const selected: string[] = [];
  for (const group of byStem.values()) {
    const rawFiles = group.filter((filePath) =>
      RAW_EXTENSIONS.has(path.extname(filePath).toLowerCase())
    );
    selected.push(...(rawFiles.length > 0 ? rawFiles : group));
  }
  return selected.toSorted((a, b) => a.localeCompare(b));
}

function runFzf(items: string[], prompt: string): string | undefined {
  try {
    return execFileSync(
      'fzf',
      ['--height', '40%', '--reverse', '--prompt', `${prompt} `],
      {
        input: items.join('\n'),
        encoding: 'utf8',
      }
    ).trim();
  } catch {
    return undefined;
  }
}

async function getDestinationFolders(): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirs.photos, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .toSorted((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

async function pickDestinationFolder(): Promise<string | undefined> {
  await fs.mkdir(dirs.photos, { recursive: true });
  const choice = runFzf(
    [...(await getDestinationFolders()), NEW_FOLDER_OPTION],
    'Destination folder'
  );
  if (choice === undefined || choice === '') {
    return undefined;
  }

  if (choice === NEW_FOLDER_OPTION) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await rl.question('New folder name: ');
    rl.close();
    const folderName = answer.trim();
    return folderName === '' ? undefined : path.join(dirs.photos, folderName);
  }

  return path.join(dirs.photos, choice);
}

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

async function getCaptureDate(filePath: string): Promise<string | undefined> {
  try {
    const { dateTimeOriginal } = await readExifMetadata(filePath);
    const match = dateTimeOriginal?.match(/^(\d{4}):(\d{2}):(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function getDestinationName(
  sourcePath: string,
  captureDate: string | undefined
): string {
  const basename = path.basename(sourcePath);
  if (captureDate === undefined) {
    return basename;
  }
  const suffix = getSuffix(basename);
  if (suffix === undefined) {
    return basename;
  }
  return `${captureDate}_${suffix}_Artem_Sapegin${path.extname(basename).toLowerCase()}`;
}

async function findPhotosToImport(cardPaths: string[]): Promise<string[]> {
  // 1. Index library filenames by suffix (date from filename, if present).
  const libraryBySuffix = new Map<string, (string | undefined)[]>();
  for (const folder of await getDestinationFolders()) {
    for (const filename of await Array.fromAsync(
      fs.glob('*', { cwd: path.join(dirs.photos, folder) })
    )) {
      const suffix = getSuffix(filename);
      if (suffix === undefined) {
        continue;
      }
      const dates = libraryBySuffix.get(suffix) ?? [];
      dates.push(getImportDate(filename));
      libraryBySuffix.set(suffix, dates);
    }
  }

  // 2. For each card file, look up library entries with the same suffix.
  const toImport: string[] = [];
  for (const sourcePath of cardPaths) {
    const suffix = getSuffix(path.basename(sourcePath));
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
      ? await getCaptureDate(sourcePath)
      : undefined;

    // 3. Skip when suffix (and date, if available) match a library import.
    if (isAlreadyImported(cardDate, libraryDates) === false) {
      toImport.push(sourcePath);
    }
  }

  return toImport;
}

async function copyPhoto(
  sourcePath: string,
  destinationPath: string
): Promise<void> {
  await fs.copyFile(sourcePath, destinationPath);
  const [sourceStats, destinationStats] = await Promise.all([
    fs.stat(sourcePath),
    fs.stat(destinationPath),
  ]);
  if (sourceStats.size !== destinationStats.size) {
    await fs.unlink(destinationPath);
    throw new Error(`Size mismatch after copy: ${path.basename(sourcePath)}`);
  }
}

async function importPhoto(
  sourcePath: string,
  tempPath: string,
  destinationDir: string
): Promise<string | undefined> {
  await copyPhoto(sourcePath, tempPath);

  const captureDate = await getCaptureDate(sourcePath);
  const destinationPath = path.join(
    destinationDir,
    getDestinationName(sourcePath, captureDate)
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

  await fs.rename(tempPath, destinationPath);
  return path.basename(destinationPath);
}

function getCommonFolder(filePaths: string[]): string {
  const directories = filePaths.map((filePath) => path.dirname(filePath));
  if (directories.length === 1) {
    return directories[0];
  }

  const parts = directories.map((directory) => directory.split(path.sep));
  const commonParts: string[] = [];
  for (let index = 0; index < parts[0].length; index++) {
    const segment = parts[0][index];
    if (parts.every((directoryParts) => directoryParts[index] === segment)) {
      commonParts.push(segment);
    } else {
      break;
    }
  }

  return commonParts.join(path.sep) || directories[0];
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

function ejectCard(cardVolume: string): void {
  console.log(`Ejecting ${cardVolume}…`);
  execSync(`diskutil eject ${JSON.stringify(cardVolume)}`, {
    stdio: 'inherit',
  });
}

async function main(): Promise<void> {
  console.log('Looking for card…');
  const cardVolumes = await findCardVolumes();
  if (cardVolumes.length === 0) {
    log.warn('No card found. Insert a card and try again.');
    process.exit(1);
  }

  const cardVolume =
    cardVolumes.length === 1
      ? cardVolumes[0]
      : runFzf(cardVolumes, 'Select card');
  if (cardVolume === undefined || cardVolume === '') {
    log.warn('No card selected.');
    process.exit(1);
  }

  console.log(`Scanning ${cardVolume}…`);
  const photos = dedupeRawJpegPairs(
    await findMediaFiles(path.join(cardVolume, 'DCIM'))
  ).flatMap((sourcePath): string[] => {
    if (getSuffix(path.basename(sourcePath)) === undefined) {
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
    if ((await confirmYesNo('Eject card? [Y/n] ')) === false) {
      log.warn('Import cancelled.');
      process.exit(1);
    }
    ejectCard(cardVolume);
    console.log('Done.');
    return;
  }

  const sourceFolder = getCommonFolder(photos);
  execFileSync('open', [sourceFolder]);
  console.log(`Importing from ${sourceFolder}…`);

  const destinationDir = await pickDestinationFolder();
  if (destinationDir === undefined) {
    log.warn('Import cancelled.');
    process.exit(1);
  }

  await fs.mkdir(destinationDir, { recursive: true });

  console.log();
  if (
    (await confirmYesNo(
      `Import ${toImport.length} photos to ${tildify(destinationDir)}? [Y/n]`
    )) === false
  ) {
    log.warn('Import cancelled.');
    process.exit(1);
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'photos-import-'));
  const failures: string[] = [];
  let importedCount = 0;
  let skippedInFolder = 0;

  try {
    for (const [index, sourcePath] of toImport.entries()) {
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
          console.log(
            `${path.basename(sourcePath)} — already in folder (${index + 1}/${toImport.length})`
          );
          continue;
        }

        importedCount++;
        console.log(
          `${path.basename(sourcePath)} → ${importedName} (${index + 1}/${toImport.length})`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(message);
        log.error(`Failed to import ${path.basename(sourcePath)}: ${message}`);
      }
    }
  } finally {
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
    if ((await confirmYesNo('Eject card? [Y/n] ')) === false) {
      log.warn('Import cancelled.');
      process.exit(1);
    }
    ejectCard(cardVolume);
    console.log('Done.');
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

  console.log('Done.');
}

await run(main);
