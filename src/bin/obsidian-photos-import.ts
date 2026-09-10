// Import JPEG files from ~/Desktop into the Obsidian vault.
//
// - Adds year prefixes to mobile photos
// - Resizes and converts images to AVIF
// - Creates daily notes for each day based on photos' EXIF
//
// Import all photos into an existing note:
//
// `obsidian-photos-import 2026-09-01_1226`
//
// Replace attachments that already exist in the vault:
//
// `obsidian-photos-import --replace 2026-09-01_1226`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
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
  getDailyNotePath,
  getMarkdownImages,
  getNotePath,
  moveToTrash,
  needsOptimization,
  openObsidianPath,
  optimizeImage,
  replaceMarkdownImageReferences,
} from '../util/obsidian.ts';
import { getDatedPhotoFilename } from '../util/photos.ts';
import { formatLocalDateTime, parseLocalDateTime } from '../util/time.ts';
import { log, run } from '../util/tui.ts';

const OPTIONS = [
  { name: 'note', positional: true },
  { name: 'replace', type: 'boolean', default: false },
] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

interface PendingPhoto {
  sourcePath: string;
  date: string;
  datetime: Date;
  attachmentName: string;
}

interface ImportedImage {
  filename: string;
  datetime: Date;
  previousFilename?: string;
}

interface ImportOptions {
  replace: boolean;
}

interface WriteNoteOptions {
  headingDate?: Date;
  replace?: boolean;
}

const UNTAGGED_LOGS_PATH = 'zz-bases/Untagged logs.base';

function sortPhotos(photos: PendingPhoto[]): PendingPhoto[] {
  return photos.toSorted(
    (left, right) => left.datetime.getTime() - right.datetime.getTime()
  );
}

function buildImageLinks(importedImages: ImportedImage[]): string {
  return importedImages.map((image) => `![[${image.filename}]]`).join('\n\n');
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
  pending: PendingPhoto,
  options: ImportOptions
): Promise<ImportedImage | undefined> {
  const { replace } = options;
  const originalBasename = path.basename(pending.sourcePath);
  const { attachmentName, datetime, sourcePath } = pending;
  const avifName = `${stripExtensions(attachmentName)}.avif`;
  let existingName: string | undefined;
  if (await doesAttachmentExist(avifName)) {
    existingName = avifName;
  } else if (await doesAttachmentExist(attachmentName)) {
    existingName = attachmentName;
  }

  if (existingName !== undefined && replace === false) {
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

  if (replace && existingName !== undefined) {
    await moveToTrash(path.join(dirs.obsidianAttachments, existingName));
  }

  await fs.rename(workingPath, attachmentPath);

  return {
    filename,
    datetime,
    previousFilename:
      existingName !== undefined && existingName !== filename
        ? existingName
        : undefined,
  };
}

async function importPhotos(
  photos: PendingPhoto[],
  options: ImportOptions
): Promise<ImportedImage[]> {
  const imported: ImportedImage[] = [];

  for (const photo of sortPhotos(photos)) {
    console.log(`Importing ${path.basename(photo.sourcePath)}…`);
    const result = await importPhoto(photo, options);
    if (result !== undefined) {
      imported.push(result);
    }
  }

  return imported;
}

function buildDailyNoteContent(
  importedImages: ImportedImage[],
  headingDate: Date
): string {
  const heading = formatNoteHeading(headingDate);
  const coverImage = importedImages[0].filename;
  const noteNamesComment =
    importedImages.length > 1
      ? `\n<!-- ${importedImages.map((image) => formatLocalDateTime(image.datetime)).join(' ')} -->`
      : '';

  return `---
location: "[[Home]]"
image: ${coverImage}
---
# ${heading}
${noteNamesComment}

${buildImageLinks(importedImages)}
`;
}

function appendImageLinks(
  noteBody: string,
  imported: ImportedImage[],
  options: ImportOptions
): string {
  let body = noteBody;

  if (options.replace) {
    for (const image of imported) {
      if (image.previousFilename !== undefined) {
        body = replaceMarkdownImageReferences(
          body,
          image.previousFilename,
          image.filename
        );
      }
    }

    const existingImages = new Set(getMarkdownImages(body));
    const toAppend = imported.filter(
      (image) => existingImages.has(image.filename) === false
    );

    if (toAppend.length === 0) {
      return `${body.trimEnd()}\n`;
    }

    return `${body.trimEnd()}\n\n${buildImageLinks(toAppend)}\n`;
  }

  return `${body.trimEnd()}\n\n${buildImageLinks(imported)}\n`;
}

/** Create a daily note when `headingDate` is set; otherwise append image links. */
async function writeNote(
  notePath: string,
  imported: ImportedImage[],
  options: WriteNoteOptions = {}
): Promise<void> {
  const { headingDate, replace = false } = options;
  let content: string;
  if (headingDate === undefined) {
    const existing = await fs.readFile(notePath, 'utf8');
    content = appendImageLinks(existing, imported, { replace });
  } else {
    content = buildDailyNoteContent(imported, headingDate);
  }

  await atomicWrite(notePath, (tempFile) =>
    fs.writeFile(tempFile, content, 'utf8')
  );

  const relativePath = path.relative(dirs.obsidianVault, notePath);
  console.log(
    headingDate === undefined
      ? `Updated ${relativePath}`
      : `Created ${relativePath}`
  );
}

async function importDay(
  photos: PendingPhoto[],
  options: ImportOptions
): Promise<ImportedImage[]> {
  const sortedPhotos = sortPhotos(photos);
  const notePath = getDailyNotePath(sortedPhotos[0].datetime);
  const imported = await importPhotos(photos, options);

  if (imported.length === 0) {
    log.warn(
      `Skipping daily note for ${sortedPhotos[0].date}: no photos imported`
    );
    return [];
  }

  let noteExists = false;
  try {
    await fs.access(notePath);
    noteExists = true;
  } catch {
    // Note doesn't exist yet
  }

  await writeNote(
    notePath,
    imported,
    noteExists
      ? { replace: options.replace }
      : { headingDate: sortedPhotos[0].datetime }
  );
  return imported;
}

async function assertExistingNote(noteBasename: string): Promise<string> {
  if (parseLocalDateTime(noteBasename) === undefined) {
    log.error(`Invalid note name: ${noteBasename}`);
    process.exit(1);
  }

  const notePath = getNotePath(noteBasename);

  try {
    await fs.access(notePath);
  } catch {
    log.error(`Note not found: ${path.relative(dirs.obsidianVault, notePath)}`);
    process.exit(1);
  }

  return notePath;
}

export async function obsidianPhotosImport(options: Options): Promise<void> {
  await assertObsidianVault();

  const photos = await glob(dirs.desktop, '*', exts.jpeg);
  console.log(`Found ${photos.length} photos on Desktop`);

  if (photos.length === 0) {
    return;
  }

  const pendingPhotos: PendingPhoto[] = [];

  for (const sourcePath of photos) {
    const pending = await readPendingPhoto(sourcePath);
    if (pending !== undefined) {
      pendingPhotos.push(pending);
    }
  }

  if (pendingPhotos.length === 0) {
    console.log('\nNo photos to import.');
    return;
  }

  let importedCount = 0;
  const importOptions: ImportOptions = { replace: options.replace };

  if (options.note !== undefined) {
    const notePath = await assertExistingNote(options.note);

    console.log();
    const imported = await importPhotos(pendingPhotos, importOptions);
    importedCount = imported.length;

    if (importedCount === 0) {
      console.log('\nNo photos imported.');
      return;
    }

    await writeNote(notePath, imported, { replace: options.replace });
    openObsidianPath(path.relative(dirs.obsidianVault, notePath));
    return;
  }

  const photosByDate = new Map<string, PendingPhoto[]>();

  for (const pending of pendingPhotos) {
    const group = photosByDate.get(pending.date) ?? [];
    group.push(pending);
    photosByDate.set(pending.date, group);
  }

  for (const dayPhotos of photosByDate.values()) {
    console.log();
    const dayImported = await importDay(dayPhotos, importOptions);
    importedCount += dayImported.length;
  }

  if (importedCount === 0) {
    console.log('\nNo photos imported.');
    return;
  }

  openObsidianPath(UNTAGGED_LOGS_PATH);
}

await run(import.meta.url, async () => {
  await obsidianPhotosImport(parseArgs(OPTIONS));
});
