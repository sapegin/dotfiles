// Archive a photo folder to NAS.
//
// - Pick a folder from ~/Pictures/Photos
// - Copy it to /Volumes/Photos/Photos/YYYY/FolderName
// - Move the local folder to ~/Pictures/z-Archived
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { copyFile, dirs, tildify } from '../util/files.ts';
import { ensureVolumeMounted } from '../util/mount.ts';
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
    .filter((filePath) =>
      isVisibleRelativePath(path.relative(root, filePath))
    )
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
  ensureVolumeMounted(dirs.nasPhotos);

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

  for (const [label, destinationDir] of [
    ['NAS destination', nasDir],
    ['Archive destination', archiveDir],
  ] as const) {
    try {
      await fs.stat(destinationDir);
      log.warn(`${label} already exists: ${tildify(destinationDir)}`);
      process.exit(1);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  console.log();
  console.log(`Source:   ${tildify(sourceDir)}`);
  console.log(`NAS:      ${tildify(nasDir)}`);
  console.log(`Archived: ${tildify(archiveDir)}`);
  console.log(`Files:    ${files.length}`);

  if (
    (await confirm(`Archive ${folderName} (${files.length} files)?`, false)) ===
    false
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
      const destinationPath = path.join(nasDir, relativePath);

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
    await fs.rm(nasDir, { recursive: true, force: true });
    log.warn(
      `${failures.length} files failed to copy; removed partial NAS copy.`
    );
    process.exit(1);
  }

  await fs.mkdir(PHOTOS_ARCHIVED_DIR, { recursive: true });
  try {
    await fs.rename(sourceDir, archiveDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.warn(
      `NAS copy succeeded, but moving to ${tildify(archiveDir)} failed: ${message}`
    );
    console.log(`Source: ${tildify(sourceDir)}`);
    console.log(`NAS:    ${tildify(nasDir)}`);
    process.exit(1);
  }

  console.log(`Archived ${folderName} to ${tildify(archiveDir)}.`);
}

await run(import.meta.url, () => photosArchive(parseArgs(OPTIONS)));
