// Atomic file write helpers used by the Obsidian sync scripts.

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/**
 * Run `produce(tempFile)` to materialize the new file content in a fresh temp
 * directory under `os.tmpdir()`, then atomically rename the temp file onto
 * `destinationFile`.
 *
 * The destinations we target live inside an iCloud-watched Obsidian vault, so:
 *
 * Why a temp dir under `os.tmpdir()` rather than a sibling of the destination?
 * The destination directory is watched by the iCloud daemon. Any file that
 * appears in it — even a transient `.tmp-…` sibling — gets picked up and queued
 * for sync. Writing the temp file outside iCloud's watch path avoids that
 * wasted churn entirely.
 *
 * Why `rename` is atomic here: POSIX `rename(2)` is a single directory-entry
 * swap on the destination's inode table, so a reader either sees the old file
 * or the new one — never a partial write. If the destination already exists,
 * the old inode is atomically replaced (this is POSIX behavior, and is what we
 * rely on for updates; it is NOT how `rename` works on, say, Windows).
 *
 * Why the cross-directory rename works: `rename(2)` is only atomic within a
 * single filesystem (same mounted volume / inode table); across volumes it
 * fails with `EXDEV`. On a default macOS APFS install, `/var/folders/.../T`
 * (where `os.tmpdir()` points) and `~/` both live on the same Data volume, so
 * the rename succeeds and is atomic. These scripts target macOS only and assume
 * that default layout — they would need rethinking on Linux (tmpfs `/tmp`),
 * Windows, or with vaults stored on external/network volumes.
 */
export async function atomicWrite(
  destinationFile: string,
  produce: (tempFile: string) => Promise<void>
): Promise<void> {
  await fs.mkdir(path.dirname(destinationFile), { recursive: true });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'atomic-write-'));
  const tempFile = path.join(tempDir, path.basename(destinationFile));
  try {
    await produce(tempFile);
    await fs.rename(tempFile, destinationFile);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

/**
 * Atomically copy `sourceFile` onto `destinationFile`.
 */
export async function atomicCopy(
  sourceFile: string,
  destinationFile: string
): Promise<void> {
  await atomicWrite(destinationFile, (tempFile) =>
    fs.copyFile(sourceFile, tempFile)
  );
}
