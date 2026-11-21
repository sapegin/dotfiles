// Archive a photo folder locally, then remind about NAS.
//
// - Pick a folder from ~/Pictures/Photos
// - Copy it to ~/Pictures/z-Archived/FolderName
// - Print instructions to move it to /Volumes/Photos/Photos/YYYY/FolderName
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { copyFile, dirs, doesPathExist, tildify } from '../util/files.ts';
import {
  getPhotoFilenameYear,
  isVisible,
  pickPhotoFolder,
} from '../util/photos.ts';
import { confirm, createProgress, log, run } from '../util/tui.ts';

const OPTIONS = [] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

const NAS_PHOTOS_DIR = path.join(dirs.nasPhotos, 'Photos');
const PHOTOS_ARCHIVED_DIR = path.join(dirs.pictures, 'z-Archived');

function isVisibleRelativePath(relativePath: string): boolean {
  return relativePath.split(path.sep).every((segment) => isVisible(segment));
}

/** Find all non-hidden files under `root`, sorted alphabetically. */
async function findVisibleFiles(root: string): Promise<string[]> {
  const entries = await Array.fromAsync(
    fs.glob('**/*', { cwd: root, withFileTypes: true })
  );

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))
    .filter((filePath) => isVisibleRelativePath(path.relative(root, filePath)))
    .toSorted((a, b) => a.localeCompare(b));
}

function getArchiveYear(files: readonly string[]): string | undefined {
  for (const filePath of files) {
    const year = getPhotoFilenameYear(path.basename(filePath));
    if (year !== undefined) {
      return year;
    }
  }
  return undefined;
}

export async function photosArchive(_options: Options): Promise<void> {
  const sourceDir = await pickPhotoFolder({ prompt: 'Folder to archive' });
  if (sourceDir === undefined) {
    process.exit(1);
  }

  const folderName = path.basename(sourceDir);
  const files = await findVisibleFiles(sourceDir);
  if (files.length === 0) {
    log.warn(`Folder is empty: ${tildify(sourceDir)}`);
    process.exit(1);
  }

  const year = getArchiveYear(files);
  if (year === undefined) {
    log.warn(`Cannot determine year from filenames in ${tildify(sourceDir)}.`);
    process.exit(1);
  }

  const nasDir = path.join(NAS_PHOTOS_DIR, year, folderName);
  const archiveDir = path.join(PHOTOS_ARCHIVED_DIR, folderName);

  if (await doesPathExist(archiveDir)) {
    log.warn(`Archive destination already exists: ${tildify(archiveDir)}`);
    process.exit(1);
  }

  if (
    (await confirm(
      `Archive to ${tildify(archiveDir)} (${files.length} files)?`,
      false
    )) === false
  ) {
    process.exit(1);
  }

  console.log();

  const progress = createProgress({ total: files.length });
  const failures: string[] = [];

  try {
    for (const [index, sourcePath] of files.entries()) {
      const current = index + 1;
      const relativePath = path.relative(sourceDir, sourcePath);
      const destinationPath = path.join(archiveDir, relativePath);

      try {
        await copyFile(sourcePath, destinationPath);
        progress.update(current, relativePath);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(message);
        progress.error(`Failed to copy ${relativePath}: ${message}`);
      }
    }
  } finally {
    progress.done();
    console.log();
  }

  if (failures.length > 0) {
    await fs.rm(archiveDir, { recursive: true, force: true });
    log.warn(
      `${failures.length} files failed to copy; removed partial archive copy.`
    );
    process.exit(1);
  }

  console.log(`In Lightroom, move the folder to ${nasDir}`);
}

await run(import.meta.url, () => photosArchive(parseArgs(OPTIONS)));
