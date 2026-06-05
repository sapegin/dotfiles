// Two-way file and folder syncing utility shared between bin/sync-dotfiles and
// bin/sync-colors. For a single file pair, the side with the newer mtime
// overwrites the other; identical contents are skipped regardless of mtime. For
// folder pairs, files present on only one side are treated as additions on that
// side (and propagated) or deletions on the other side (reported only, never
// removed — `src` is treated as authoritative).
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs/promises';
import path from 'node:path';
import { logError, logWarn } from './log.ts';

export type SyncResult =
  | 'missing' // `src` does not exist (single-file mode only)
  | 'equal' // contents already match
  | 'pulled' // `src` newer, `dest` was overwritten
  | 'pushed' // `dest` newer, `src` was overwritten
  | 'added' // file only in `src`, copied to `dest`
  | 'deleted'; // file only in `dest`, reported but not removed

export interface FolderSyncEntry {
  /** Path relative to the synced folder root. */
  path: string;
  result: SyncResult;
}

async function mtimeMs(filePath: string): Promise<number | null> {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtimeMs;
  } catch {
    return null;
  }
}

async function copyPreservingMtime(src: string, dest: string): Promise<void> {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
  const { atime, mtime } = await fs.stat(src);
  await fs.utimes(dest, atime, mtime);
}

/** List all regular files inside `dir` as paths relative to `dir`. */
async function listFilesRecursive(dir: string): Promise<Set<string>> {
  const files = new Set<string>();
  let entries;
  try {
    entries = await fs.readdir(dir, { recursive: true, withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.isFile()) {
      const fullPath = path.join(entry.parentPath, entry.name);
      files.add(path.relative(dir, fullPath));
    }
  }
  return files;
}

/**
 * Test whether `relativePath` matches any pattern in `patterns`. Each pattern
 * is a JavaScript regular expression source, tested against the path with
 * `RegExp.test` (i.e. unanchored substring match unless the pattern itself uses
 * `^` or `$`). When `isDirectory` is true the path is tested with a trailing
 * `/`, so directory-only patterns can use `/$`.
 */
export function isIgnored(
  relativePath: string,
  patterns: readonly string[],
  isDirectory = false
): boolean {
  if (patterns.length === 0) {
    return false;
  }
  const target = isDirectory ? `${relativePath}/` : relativePath;
  return patterns.some((pattern) => new RegExp(pattern).test(target));
}

/**
 * Print a one-line summary of a sync result; or nothing when nothing changed.
 */
function printResult(result: SyncResult, filename: string): void {
  if (result === 'missing') {
    logError(`✕ ${filename}\n↪ Source not found!`);
  } else if (result === 'pulled') {
    console.log(`⬇ ${filename}`);
  } else if (result === 'pushed') {
    console.log(`⬆ ${filename}`);
  } else if (result === 'added') {
    console.log(`+ ${filename}`);
  } else if (result === 'deleted') {
    logWarn(` ${filename}\n↪ Source deleted!`);
  }
}

/** Core syncFile logic without any console output. */
async function syncFileQuiet(src: string, dest: string): Promise<SyncResult> {
  const srcMs = await mtimeMs(src);
  if (srcMs === null) {
    return 'missing';
  }

  const destMs = await mtimeMs(dest);

  if (destMs !== null) {
    const [srcBuf, destBuf] = await Promise.all([
      fs.readFile(src),
      fs.readFile(dest),
    ]);
    if (srcBuf.equals(destBuf)) {
      return 'equal';
    }
  }

  if (destMs === null || srcMs > destMs) {
    await copyPreservingMtime(src, dest);
    return 'pulled';
  }

  await copyPreservingMtime(dest, src);
  return 'pushed';
}

/**
 * Two-way sync a single file between `src` and `dest`. Identical contents are
 * skipped regardless of mtime; otherwise the side with the newer mtime
 * overwrites the other. Prints a one-line summary for `'pulled'`/`'pushed'`.
 *
 * @returns `'missing'` if `src` does not exist, `'equal'` if contents already
 *     match, `'pulled'` if `src` was newer (or `dest` was missing) and `dest`
 *     was overwritten, `'pushed'` if `dest` was newer and `src` was
 *     overwritten.
 */
export async function syncFile(src: string, dest: string): Promise<SyncResult> {
  const result = await syncFileQuiet(src, dest);
  printResult(result, path.basename(src));
  return result;
}

/**
 * Two-way sync all files in two folders recursively. For each file present on
 * both sides, behavior matches `syncFile`. Files present only in `src` are
 * copied to `dest` (`'added'`). Files present only in `dest` are reported as
 * `'deleted'` but **not** removed — `src` is treated as the authoritative side,
 * so an extra file in `dest` is assumed to have been deleted from `src` and is
 * flagged for the caller to clean up manually.
 *
 * Files matching any pattern in `ignore` (gitignore-style; see `isIgnored`)
 * are skipped on both sides.
 *
 * @returns One entry per file (in sorted order) describing the action
 *   taken or skipped.
 */
export async function syncFolder(
  src: string,
  dest: string,
  ignore: readonly string[] = []
): Promise<FolderSyncEntry[]> {
  const [srcFiles, destFiles] = await Promise.all([
    listFilesRecursive(src),
    listFilesRecursive(dest),
  ]);

  const allPaths = [...new Set([...srcFiles, ...destFiles])]
    .filter((p) => !isIgnored(p, ignore))
    .toSorted();
  const entries: FolderSyncEntry[] = [];

  for (const relPath of allPaths) {
    const srcPath = path.join(src, relPath);
    const destPath = path.join(dest, relPath);
    const inSrc = srcFiles.has(relPath);
    const inDest = destFiles.has(relPath);

    let result: SyncResult;
    if (inSrc && inDest) {
      result = await syncFileQuiet(srcPath, destPath);
    } else if (inSrc) {
      await copyPreservingMtime(srcPath, destPath);
      result = 'added';
    } else {
      // Only in `dest` — report, do not remove.
      result = 'deleted';
    }
    printResult(result, relPath);
    entries.push({ path: relPath, result });
  }

  return entries;
}
