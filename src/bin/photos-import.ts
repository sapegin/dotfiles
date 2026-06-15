// Import photos from a camera memory card into ~/Pictures/Photos.
//
// - Detects a mounted card (volume containing DCIM/)
// - Prefers RAW over JPEG pairs
// - Detects duplicates by matching number suffixes, then comparing capture dates
// - Copies each new file to a temp folder on disk, reads EXIF there, then moves with the final name
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
import ExifReader from 'exifreader';
import { logError, logWarn } from '../util/log.ts';

const PHOTOS_ROOT = path.join(os.homedir(), 'Pictures/Photos');
const VOLUMES_DIR = '/Volumes';
const NEW_FOLDER_OPTION = '+ New folder…';

const RAW_EXTENSIONS = new Set([
  '.raf',
  '.cr2',
  '.cr3',
  '.nef',
  '.arw',
  '.dng',
  '.orf',
  '.rw2',
  '.pef',
  '.srw',
]);
const MEDIA_EXTENSIONS = new Set([
  ...RAW_EXTENSIONS,
  '.jpg',
  '.jpeg',
  '.heic',
  '.tif',
  '.tiff',
  '.png',
  '.mov',
  '.mp4',
  '.m4v',
  '.avi',
]);
const STANDARD_IMPORT_PATTERN =
  /^(\d{4}-\d{2}-\d{2})_(\d+)_Artem_Sapegin\.[^.]+$/i;

interface Photo {
  sourcePath: string;
  basename: string;
  suffix: string;
  extension: string;
  captureDate?: string;
}

interface ImportedMatch {
  suffix: string;
  captureDate?: string;
}

function getSuffix(filename: string): string | undefined {
  return path.basename(filename, path.extname(filename)).match(/(\d+)$/)?.[1];
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
    const entries = await fs.readdir(PHOTOS_ROOT, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .toSorted((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

async function pickDestinationFolder(): Promise<string | undefined> {
  await fs.mkdir(PHOTOS_ROOT, { recursive: true });
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
    return folderName === '' ? undefined : path.join(PHOTOS_ROOT, folderName);
  }

  return path.join(PHOTOS_ROOT, choice);
}

function parseImportedFile(filename: string): ImportedMatch | undefined {
  const standardMatch = filename.match(STANDARD_IMPORT_PATTERN);
  if (standardMatch) {
    return { captureDate: standardMatch[1], suffix: standardMatch[2] };
  }
  const suffix = getSuffix(filename);
  return suffix === undefined ? undefined : { suffix };
}

async function collectImportedPhotos(): Promise<ImportedMatch[]> {
  const imported: ImportedMatch[] = [];
  for (const folder of await getDestinationFolders()) {
    for (const file of await Array.fromAsync(
      fs.glob('*', { cwd: path.join(PHOTOS_ROOT, folder) })
    )) {
      const match = parseImportedFile(file);
      if (match) {
        imported.push(match);
      }
    }
  }
  return imported;
}

function libraryMatchesForSuffix(
  suffix: string,
  importedPhotos: ImportedMatch[]
): ImportedMatch[] {
  return importedPhotos.filter((imported) => imported.suffix === suffix);
}

function isDuplicate(
  captureDate: string | undefined,
  libraryMatches: ImportedMatch[]
): boolean {
  if (libraryMatches.length === 0) {
    return false;
  }

  for (const imported of libraryMatches) {
    if (imported.captureDate === undefined) {
      return true;
    }
    if (
      captureDate !== undefined &&
      datesWithinDay(imported.captureDate, captureDate)
    ) {
      return true;
    }
  }

  return false;
}

async function getCaptureDate(filePath: string): Promise<string | undefined> {
  try {
    const exif = ExifReader.load(await fs.readFile(filePath)) as Partial<
      Record<string, { description?: string }>
    >;
    const match = exif.DateTimeOriginal?.description?.match(
      /^(\d{4}):(\d{2}):(\d{2})/
    );
    return match ? `${match[1]}-${match[2]}-${match[3]}` : undefined;
  } catch {
    return undefined;
  }
}

function destinationName(
  photo: Photo,
  captureDate: string | undefined
): string {
  if (captureDate === undefined) {
    return photo.basename;
  }
  return `${captureDate}_${photo.suffix}_Artem_Sapegin${photo.extension}`;
}

async function filterNewPhotos(
  photos: Photo[],
  importedPhotos: ImportedMatch[]
): Promise<{ toImport: Photo[]; skipped: number }> {
  const toImport: Photo[] = [];
  let skipped = 0;
  const datedMatches = photos.filter((photo) =>
    libraryMatchesForSuffix(photo.suffix, importedPhotos).some(
      (imported) => imported.captureDate !== undefined
    )
  );

  let datedMatchIndex = 0;
  for (const photo of photos) {
    const libraryMatches = libraryMatchesForSuffix(
      photo.suffix,
      importedPhotos
    );
    if (libraryMatches.length === 0) {
      toImport.push(photo);
      continue;
    }

    let captureDate = photo.captureDate;
    const needsCaptureDate = libraryMatches.some(
      (imported) => imported.captureDate !== undefined
    );
    if (needsCaptureDate && captureDate === undefined) {
      datedMatchIndex++;
      if (datedMatches.length > 1) {
        process.stdout.write(
          `\rReading photo dates… (${datedMatchIndex}/${datedMatches.length})`
        );
      }
      captureDate = await getCaptureDate(photo.sourcePath);
    }

    if (isDuplicate(captureDate, libraryMatches)) {
      skipped++;
      continue;
    }

    toImport.push(
      captureDate === undefined ? photo : { ...photo, captureDate }
    );
  }

  if (datedMatches.length > 1) {
    process.stdout.write('\n');
  }

  return { toImport, skipped };
}

function fileExists(filePath: string): Promise<boolean> {
  return fs.access(filePath).then(
    () => true,
    () => false
  );
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

async function importPhoto({
  photo,
  tempPath,
  destinationDir,
}: {
  photo: Photo;
  tempPath: string;
  destinationDir: string;
}): Promise<{ status: 'imported' | 'skipped'; destinationName?: string }> {
  await copyPhoto(photo.sourcePath, tempPath);

  const captureDate = photo.captureDate ?? (await getCaptureDate(tempPath));
  const name = destinationName(photo, captureDate);
  const destinationPath = path.join(destinationDir, name);
  if (await fileExists(destinationPath)) {
    await fs.unlink(tempPath);
    return { status: 'skipped' };
  }

  await fs.rename(tempPath, destinationPath);

  return { status: 'imported', destinationName: name };
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

function photoCount(count: number): string {
  return `${count} photo${count === 1 ? '' : 's'}`;
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

function confirmProceed(
  destinationDir: string,
  importCount: number
): Promise<boolean> {
  console.log('');
  console.log(`Import ${photoCount(importCount)} to ${destinationDir}.`);
  return confirmYesNo('Proceed? [Y/n] ');
}

async function main(): Promise<void> {
  console.log('Looking for card…');
  const cardVolumes = await findCardVolumes();
  if (cardVolumes.length === 0) {
    logWarn('No card found. Insert a card and try again.');
    process.exit(1);
  }

  const cardVolume =
    cardVolumes.length === 1
      ? cardVolumes[0]
      : runFzf(cardVolumes, 'Select card');
  if (cardVolume === undefined || cardVolume === '') {
    logWarn('No card selected.');
    process.exit(1);
  }

  console.log(`Scanning ${cardVolume}…`);
  const photos = dedupeRawJpegPairs(
    await findMediaFiles(path.join(cardVolume, 'DCIM'))
  )
    .map((sourcePath): Photo | undefined => {
      const basename = path.basename(sourcePath);
      const suffix = getSuffix(basename);
      if (suffix === undefined) {
        logWarn(`Skipping ${basename}: cannot determine number suffix`);
        return undefined;
      }
      return {
        sourcePath,
        basename,
        suffix,
        extension: path.extname(basename),
      };
    })
    .filter((photo) => photo !== undefined);

  if (photos.length === 0) {
    logWarn(`No photos found on ${cardVolume}.`);
    process.exit(1);
  }

  console.log(`Checking duplicates for ${photoCount(photos.length)} photos…`);
  const importedPhotos = await collectImportedPhotos();

  const sourceFolder = getCommonFolder(photos.map((photo) => photo.sourcePath));
  const { toImport, skipped } = await filterNewPhotos(photos, importedPhotos);
  if (skipped > 0) {
    console.log(`Skipping ${photoCount(skipped)} already imported photos.`);
  }

  if (toImport.length === 0) {
    if ((await confirmYesNo('Eject card? [Y/n] ')) === false) {
      logWarn('Import cancelled.');
      process.exit(1);
    }

    console.log(`Ejecting ${cardVolume}…`);
    execSync(`diskutil eject ${JSON.stringify(cardVolume)}`, {
      stdio: 'inherit',
    });
    console.log('Done.');
    return;
  }

  execFileSync('open', [sourceFolder]);

  console.log(`Importing from ${sourceFolder}…`);

  const destinationDir = await pickDestinationFolder();
  if (destinationDir === undefined) {
    logWarn('Import cancelled.');
    process.exit(1);
  }

  await fs.mkdir(destinationDir, { recursive: true });

  if ((await confirmProceed(destinationDir, toImport.length)) === false) {
    logWarn('Import cancelled.');
    process.exit(1);
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'photos-import-'));
  const failures: string[] = [];
  let importedCount = 0;
  let skippedCount = 0;

  try {
    for (const [index, photo] of toImport.entries()) {
      const tempPath = path.join(
        tempDir,
        `${String(index).padStart(4, '0')}_${photo.basename}`
      );

      try {
        const result = await importPhoto({
          photo,
          tempPath,
          destinationDir,
        });

        if (result.status === 'skipped') {
          skippedCount++;
          console.log(
            `${photo.basename} — already in folder (${index + 1}/${toImport.length})`
          );
          continue;
        }

        importedCount++;
        console.log(
          `${photo.basename} → ${result.destinationName} (${index + 1}/${toImport.length})`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(message);
        logError(`Failed to import ${photo.basename}: ${message}`);
      }
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    logWarn(`${failures.length} files failed to import; card was not ejected.`);
    process.exit(1);
  }

  if (importedCount === 0) {
    console.log(
      `Nothing imported (${photoCount(skippedCount)} already in folder).`
    );
    if ((await confirmYesNo('Eject card? [Y/n] ')) === false) {
      logWarn('Import cancelled.');
      process.exit(1);
    }

    console.log(`Ejecting ${cardVolume}…`);
    execSync(`diskutil eject ${JSON.stringify(cardVolume)}`, {
      stdio: 'inherit',
    });
    console.log('Done.');
    return;
  }

  if (skippedCount > 0) {
    console.log(`Skipped ${photoCount(skippedCount)} already in folder.`);
  }

  console.log(`Ejecting ${cardVolume}…`);
  execSync(`diskutil eject ${JSON.stringify(cardVolume)}`, {
    stdio: 'inherit',
  });

  try {
    execFileSync('open', ['-a', 'Photomator', destinationDir], {
      stdio: 'inherit',
    });
  } catch {
    logWarn('Could not open Photomator.');
  }

  console.log('Done.');
}

try {
  await main();
} catch (error) {
  logError(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
