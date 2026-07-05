import fs from 'node:fs/promises';
import path from 'node:path';
import { dirs, exts, glob, hasExtension } from './files.ts';
import { select } from './fzf.ts';
import { prompt } from './prompt.ts';

export const IMPORT_DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})_/;
const NEW_FOLDER_OPTION = '+ New folder…';
const ATTACHMENT_YEAR_PREFIX = /^(\d{4})(?:-\d{2}-\d{2}_|_IMG_)/i;
const UNPREFIXED_IPHONE_PHOTO = /^IMG_\d{4}\./i;

/**
 * Read year prefix from photo names:
 *
 * - '2026_IMG_9488.jpeg' → '2026'
 * - '1984-02-22_7859_Artem_Sapegin.jpg' → '1984'
 */
export function getPhotoFilenameYear(filename: string): string | undefined {
  return path.basename(filename).match(ATTACHMENT_YEAR_PREFIX)?.[1];
}

/**
 * Read `YYYY-MM-DD` date from photo names:
 *
 * - '2026-07-03_1234_Artem_Sapegin.jpg' → '2026-07-03'
 */
export function getPhotoFilenameDate(filename: string): string | undefined {
  return path.basename(filename).match(IMPORT_DATE_PREFIX)?.[1];
}

/**
 * Extract the numeric suffix from camera filenames:
 *
 * - '_MG_1234.CR2' → '1234'.
 * - '2026-07-03_1234_Artem_Sapegin.jpg' → '1234'
 */
export function getPhotoFilenameSuffix(filename: string): string | undefined {
  const stem = path
    .basename(filename, path.extname(filename))
    .replace(IMPORT_DATE_PREFIX, '');
  return stem.match(/^(\d+)/)?.[1] ?? stem.match(/(\d+)$/)?.[1];
}

/** Return key to group RAW/JPEG variants by folder and filename stem. */
export function getPhotoPairKey(filePath: string): string {
  const stem = path.parse(filePath).name.toLowerCase();
  return `${path.dirname(filePath)}/${stem}`;
}

/** Ignore hidden macOS and dotfiles when scanning photo folders. */
export function isVisiblePhotoFile(filePath: string): boolean {
  return path.basename(filePath).startsWith('.') === false;
}

/** Prefer RAW files over matching JPEG variants. */
export function dedupeRawJpegPairs(filePaths: string[]): string[] {
  const byStem = new Map<string, string[]>();
  for (const filePath of filePaths) {
    const key = getPhotoPairKey(filePath);
    const group = byStem.get(key) ?? [];
    group.push(filePath);
    byStem.set(key, group);
  }

  const selected: string[] = [];
  for (const group of byStem.values()) {
    const rawFiles = group.filter((filePath) =>
      hasExtension(filePath, exts.raw)
    );
    selected.push(...(rawFiles.length > 0 ? rawFiles : group));
  }
  return selected.toSorted((a, b) => a.localeCompare(b));
}

/** Find supported media files recursively. */
export async function findMediaFiles(root: string): Promise<string[]> {
  const files = await glob(root, '**/*', exts.media);
  return files
    .filter(isVisiblePhotoFile)
    .toSorted((a, b) => a.localeCompare(b));
}

/** List existing photo folders in the local photo library. */
export async function getPhotoFolders(): Promise<string[]> {
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

/** Ask the user to choose a photo folder, optionally creating a new one. */
export async function pickPhotoFolder(
  options: {
    allowNewFolder?: boolean;
    prompt?: string;
  } = {}
): Promise<string | undefined> {
  const { allowNewFolder = false, prompt: selectPrompt = 'Photo folder' } =
    options;
  const folders = await getPhotoFolders();
  const choices = allowNewFolder ? [...folders, NEW_FOLDER_OPTION] : folders;
  if (choices.length === 0) {
    return undefined;
  }

  const choice = select(choices, selectPrompt);
  if (!choice) {
    return undefined;
  }

  if (choice === NEW_FOLDER_OPTION) {
    const answer = await prompt('New folder name: ');
    const folderName = answer.trim();
    return folderName === '' ? undefined : path.join(dirs.photos, folderName);
  }

  return path.join(dirs.photos, choice);
}

/**
 * Build a dated photo filename from EXIF and the original basename:
 *
 * - 'IMG_9488.jpeg' → '2026_IMG_9488.jpeg'
 * - '_MG_1234.JPG' → '2026-07-03_1234_Artem_Sapegin.jpg'
 */
export function getDatedPhotoFilename(
  originalBasename: string,
  year: string,
  date?: string
): string {
  // File already has date, return as is
  if (getPhotoFilenameYear(originalBasename) !== undefined) {
    return originalBasename;
  }

  const ext = path.extname(originalBasename).toLowerCase();

  // Mobile photos are prefixed with year only
  if (UNPREFIXED_IPHONE_PHOTO.test(originalBasename)) {
    return `${year}_${path.basename(originalBasename, path.extname(originalBasename))}${ext}`;
  }

  // Camera photos are prefixed with full year
  const suffix = getPhotoFilenameSuffix(originalBasename);
  if (suffix !== undefined && date !== undefined) {
    return `${date}_${suffix}_Artem_Sapegin${ext}`;
  }

  return originalBasename;
}
