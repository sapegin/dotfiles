// Publish morning.photos from the iCloud photo export folder.
//
// `photos-publish`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs/promises';
import path from 'node:path';
import { publishPhotos } from '../publish/photos.ts';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { dirs } from '../util/files.ts';
import { log, run } from '../util/tui.ts';

const OPTIONS = [] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

const REPO_ROOT = path.join(dirs.projects, 'sapegin.me');

export async function photosPublish(_options: Options): Promise<void> {
  const sourceDir = dirs.iCloudWebPhotos;

  try {
    await fs.access(sourceDir);
  } catch {
    log.error('\n✕ Error: Photo source directory does not exist:', sourceDir);
    process.exit(1);
  }

  console.log(`Repo: ${REPO_ROOT}\n`);
  await publishPhotos(REPO_ROOT);
}

await run(import.meta.url, () => photosPublish(parseArgs(OPTIONS)));
