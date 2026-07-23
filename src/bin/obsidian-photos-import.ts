// Import JPEG files from ~/Desktop into the Obsidian vault.
//
// - Adds year prefixes to mobile photos
// - Resizes and converts images to AVIF
// - Creates daily notes for each day based on photos' EXIF
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs/promises';
import path from 'node:path';
import { readExifMetadata } from '../util/exif.ts';
import {
  atomicWrite,
  dirs,
  exts,
  glob,
  stripExtensions,
} from '../util/files.ts';
import {
  assertObsidianVault,
  doesAttachmentExist,
  formatNoteHeading,
  needsOptimization,
  openObsidianPath,
  optimizeImage,
} from '../util/obsidian.ts';
import { getDatedPhotoFilename } from '../util/photos.ts';
import { formatLocalDateTime } from '../util/time.ts';
import { log, run } from '../util/tui.ts';

interface PendingPhoto {
  sourcePath: string;
  date: string;
  datetime: Date;
  attachmentName: string;
}

interface ImportedImage {
  filename: string;
  datetime: Date;
}

const UNTAGGED_LOGS_PATH = 'zz-bases/Untagged logs.base';

/**
 * Resolve the daily note file that for a given timestamp.
 *
 * - Date() → ~/murder/Log/2026/2026-07-05_1021.md
 */
function getDailyNotePath(datetime: Date): string {
  const noteBasename = formatLocalDateTime(datetime);
  const year = noteBasename.slice(0, 4);
  return path.join(dirs.obsidianDailyNotes, year, `${noteBasename}.md`);
}

async function readPendingPhoto(
  sourcePath: string
): Promise<PendingPhoto | undefined> {
  const originalBasename = path.basename(sourcePath);
  const { date, year, datetime } = await readExifMetadata(sourcePath);

  if (date === undefined || year === undefined || datetime === undefined) {
    log.warn(`Skipping ${originalBasename}: missing DateTimeOriginal`);
    return undefined;
  }

  return {
    date,
    datetime,
    sourcePath,
    attachmentName: getDatedPhotoFilename(originalBasename, year, date),
  };
}

async function importPhoto(
  pending: PendingPhoto
): Promise<ImportedImage | undefined> {
  const originalBasename = path.basename(pending.sourcePath);
  const { attachmentName, datetime, sourcePath } = pending;
  const avifName = `${stripExtensions(attachmentName)}.avif`;
  let existingName: string | undefined;
  if (await doesAttachmentExist(avifName)) {
    existingName = avifName;
  } else if (await doesAttachmentExist(attachmentName)) {
    existingName = attachmentName;
  }

  if (existingName !== undefined) {
    log.warn(`Skipping ${originalBasename}: ${existingName} already exists`);
    return undefined;
  }

  const desktopDir = path.dirname(sourcePath);
  let workingPath = sourcePath;
  if (attachmentName !== originalBasename) {
    workingPath = path.join(desktopDir, attachmentName);
    await fs.rename(sourcePath, workingPath);
  }

  let filename = attachmentName.normalize('NFC');
  const optimization = await needsOptimization(workingPath);
  if (optimization !== undefined) {
    const result = await optimizeImage(workingPath, optimization, {
      onSkip: (message) => log.warn(message),
    });
    if (result !== undefined) {
      filename = result.newFilename;
      workingPath = path.join(desktopDir, filename);
    }
  }

  const attachmentPath = path.join(dirs.obsidianAttachments, filename);
  await fs.mkdir(path.dirname(attachmentPath), { recursive: true });
  await fs.rename(workingPath, attachmentPath);

  return {
    filename,
    datetime,
  };
}

function buildDailyNoteContent(importedImages: ImportedImage[]): string {
  const sortedImages = importedImages.toSorted(
    (left, right) => left.datetime.getTime() - right.datetime.getTime()
  );
  const heading = formatNoteHeading(sortedImages[0].datetime);
  const coverImage = sortedImages[0].filename;
  const noteNamesComment =
    sortedImages.length > 1
      ? `\n<!-- ${sortedImages.map((image) => formatLocalDateTime(image.datetime)).join(' ')} -->`
      : '';
  const imageLinks = sortedImages
    .map((image) => `![[${image.filename}]]`)
    .join('\n\n');

  return `---
location: "[[Home]]"
image: ${coverImage}
---
# ${heading}
${noteNamesComment}

${imageLinks}
`;
}

async function importDay(photos: PendingPhoto[]): Promise<ImportedImage[]> {
  const sortedPhotos = photos.toSorted(
    (left, right) => left.datetime.getTime() - right.datetime.getTime()
  );
  const notePath = getDailyNotePath(sortedPhotos[0].datetime);

  try {
    await fs.access(notePath);
    console.log(
      `Skipping ${path.relative(dirs.obsidianVault, notePath)} — already exists`
    );
    return [];
  } catch {
    // Note doesn't exist yet
  }

  const imported: ImportedImage[] = [];

  for (const photo of sortedPhotos) {
    console.log(`Importing ${path.basename(photo.sourcePath)}…`);
    const result = await importPhoto(photo);
    if (result !== undefined) {
      imported.push(result);
    }
  }

  if (imported.length === 0) {
    log.warn(
      `Skipping daily note for ${sortedPhotos[0].date}: no photos imported`
    );
    return [];
  }

  const content = buildDailyNoteContent(imported);
  await atomicWrite(notePath, (tempFile) =>
    fs.writeFile(tempFile, content, 'utf8')
  );
  console.log(`Created ${path.relative(dirs.obsidianVault, notePath)}`);

  return imported;
}

async function main(): Promise<void> {
  await assertObsidianVault();

  const photos = await glob(dirs.desktop, '*', exts.jpeg);
  console.log(`Found ${photos.length} photos on Desktop`);

  if (photos.length === 0) {
    return;
  }

  const photosByDate = new Map<string, PendingPhoto[]>();

  for (const sourcePath of photos) {
    const pending = await readPendingPhoto(sourcePath);
    if (pending === undefined) {
      continue;
    }

    const group = photosByDate.get(pending.date) ?? [];
    group.push(pending);
    photosByDate.set(pending.date, group);
  }

  if (photosByDate.size === 0) {
    console.log('\nNo photos to import.');
    return;
  }

  let importedCount = 0;

  for (const dayPhotos of photosByDate.values()) {
    console.log();
    const dayImported = await importDay(dayPhotos);
    importedCount += dayImported.length;
  }

  if (importedCount === 0) {
    console.log('\nNo photos imported.');
    return;
  }

  openObsidianPath(UNTAGGED_LOGS_PATH);
}

await run(main, { printDone: true });
