// Two-way file syncing utility shared between bin/sync-dotfiles and
// bin/sync-colors. For a single file pair, the side with the newer mtime
// overwrites the other; identical contents are skipped regardless of mtime.
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs/promises';
import path from 'node:path';

export type SyncResult = 'missing' | 'equal' | 'pulled' | 'pushed';

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

/**
 * Two-way sync a single file between `src` and `dest`. Identical contents
 * are skipped regardless of mtime; otherwise the side with the newer mtime
 * overwrites the other.
 *
 * @returns `'missing'` if `src` does not exist, `'equal'` if contents
 *   already match, `'pulled'` if `src` was newer (or `dest` was missing) and
 *   `dest` was overwritten, `'pushed'` if `dest` was newer and `src` was
 *   overwritten.
 */
export async function syncFile(
  src: string,
  dest: string
): Promise<SyncResult> {
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
