import type nodeFs from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const HOME = os.homedir();

export const dirs = {
  home: HOME,
  dotfiles: path.resolve(import.meta.dirname, '..', '..'),
  projects: path.join(HOME, '_'),
  obsidianVault: path.join(HOME, 'murder'),
  obsidianDailyNotes: path.join(HOME, 'murder/Log'),
  obsidianAttachments: path.join(HOME, 'murder/zz-attachments'),
  obsidianVaultTrash: path.join(HOME, 'murder/.trash'),
  obsidianTrash: path.join(HOME, '.obsidian-trash'),
  obsidianBackup: path.join(HOME, '.obsidian-backup'),
  iCloud: path.join(HOME, 'cloud'),
  documents: path.join(HOME, 'Documents'),
  desktop: path.join(HOME, 'Desktop'),
  pictures: path.join(HOME, 'Pictures'),
  photos: path.join(HOME, 'Pictures', 'Photos'),
  nasPhotos: '/Volumes/Photos',
  nasStuffses: '/Volumes/Stuffses',
} as const;

/**
 * File extension groups, lowercase and with a leading dot. This is the single
 * source of truth for extensions across all scripts; compose these arrays
 * instead of redeclaring literals.
 */

const EXTS_JPEG = ['.jpg', '.jpeg'];
const EXTS_IMAGE = [
  ...EXTS_JPEG,
  '.avif',
  '.bmp',
  '.gif',
  '.heic',
  '.png',
  '.tif',
  '.tiff',
  '.webp',
];
const EXTS_RAW = [
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
];
const EXTS_MD = ['.md'];
const EXTS_VIDEO = ['.mov', '.mp4', '.m4v', '.avi'];

const allExtensions: readonly string[] = [
  ...EXTS_IMAGE,
  ...EXTS_RAW,
  ...EXTS_VIDEO,
  ...EXTS_MD,
];

export const exts = {
  jpeg: EXTS_JPEG,
  image: EXTS_IMAGE,
  raw: EXTS_RAW,
  video: EXTS_VIDEO,
  media: [...EXTS_IMAGE, ...EXTS_RAW, ...EXTS_VIDEO],
  markdown: EXTS_MD,
} as const;

export function tildify(filepath: string): string {
  return filepath.replace(HOME, '~');
}

export function untildify(input: string): string {
  if (input === '~') {
    return HOME;
  }
  if (input.startsWith('~/')) {
    return path.join(HOME, input.slice(2));
  }
  return input;
}

/** Return the nearest common parent folder for a list of file paths. */
export function getCommonFolder(filePaths: readonly string[]): string {
  const directories = filePaths.map((filePath) => path.dirname(filePath));
  if (directories.length === 0) {
    return '';
  }
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

/** Case-insensitive check whether `filePath` has one of `extensions`. */
export function hasExtension(
  filePath: string,
  extensions: readonly string[]
): boolean {
  return extensions.includes(path.extname(filePath).toLowerCase());
}

/**
 * Strip all trailing known extensions from `filename` case-insensitively,
 * including stacked.
 *
 * - `pizza.jpeg.webp` → `pizza`
 */
export function stripExtensions(filename: string): string {
  let result = filename;
  while (true) {
    const ext = path.extname(result);
    if (allExtensions.includes(ext.toLowerCase()) === false) {
      return result;
    }
    result = result.slice(0, -ext.length);
  }
}

/**
 * Brace expansion matching `extensions` in both lower- and uppercase:
 * `{jpg,jpeg,JPG,JPEG}`.
 */
export function getExtensionsBrace(extensions: readonly string[]): string {
  const variants = extensions.flatMap((ext) => {
    const bare = ext.slice(1);
    return [bare, bare.toUpperCase()];
  });
  return `{${[...new Set(variants)].join(',')}}`;
}

type GlobPatternArgs = [string, ...string[], readonly string[]];

export function parseGlobArgs(args: readonly unknown[]): {
  pattern: string;
  options?: nodeFs.GlobOptions;
} {
  const rest = [...args];
  let options: nodeFs.GlobOptions | undefined;

  const last = rest.at(-1);
  if (
    typeof last === 'object' &&
    last !== null &&
    Array.isArray(last) === false
  ) {
    options = last as nodeFs.GlobOptions;
    rest.pop();
  }

  const extensions = rest.pop() as readonly string[];
  const name = rest.pop() as string;
  const filePattern = `${name}.${getExtensionsBrace(extensions)}`;

  return {
    pattern:
      rest.length === 0
        ? filePattern
        : path.join(...(rest as string[]), filePattern),
    options,
  };
}

/**
 * Collect files matching the pattern from `getGlobPattern()` into an array.
 */
export function glob(...args: GlobPatternArgs): Promise<string[]>;
export function glob(
  ...args: [...GlobPatternArgs, nodeFs.GlobOptions]
): Promise<string[]>;
export function glob(...args: unknown[]): Promise<string[]> {
  const { pattern, options } = parseGlobArgs(args);

  return Array.fromAsync(
    options === undefined ? fs.glob(pattern) : fs.glob(pattern, options)
  ) as Promise<string[]>;
}

/**
 * Copy a file, create parent folders, and reject partial writes by comparing
 * size.
 */
export async function copyFile(
  sourcePath: string,
  destinationPath: string
): Promise<void> {
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
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
