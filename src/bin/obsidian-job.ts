/*
 * Creates a job application note in the Obsidian vault and opens it.
 *
 * Alfred Run Script setting: pass `{query}` as the script argument.
 *
 * Author: Artem Sapegin, sapegin.me
 * License: MIT
 * https://github.com/sapegin/dotfiles
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { atomicWrite, dirs } from '../util/files.ts';
import { openObsidianPath } from '../util/obsidian.ts';
import { formatLocalDate } from '../util/time.ts';
import { run } from '../util/tui.ts';

const OPTIONS = [
  {
    name: 'title',
    positional: true,
  },
] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

const JOBS_DIR = path.join(dirs.obsidianVault, 'Jobs/Applications');
const OPEN_DELAY_MS = 500;

function sanitizeFileName(name: string): string {
  return name.replaceAll(/[/\\:*?"<>|]/g, '').trim();
}

function buildNoteContent(noteTitle: string, date: string): string {
  return `---
status: applied
created: ${date}
tags:
  - job-applications
---
# ${noteTitle}

## Job description

`;
}

/** Create a job application note in the vault and open it in Obsidian. */
export async function obsidianJob(options: Options): Promise<void> {
  const title = options.title?.trim() ?? '';

  if (title === '') {
    return;
  }

  const fileName = sanitizeFileName(title);

  if (fileName === '') {
    return;
  }

  const notePath = path.join(JOBS_DIR, `${fileName}.md`);
  const noteRelativePath = path.join('Jobs/Applications', `${fileName}.md`);

  try {
    await fs.access(notePath);
    console.error(`Note already exists: ${notePath}`);
    process.exit(1);
  } catch {
    // File does not exist — create it.
  }

  const date = formatLocalDate(new Date());
  const content = buildNoteContent(title, date);

  await atomicWrite(notePath, (tempFile) => fs.writeFile(tempFile, content));

  // Obsidian often misses brand-new files opened immediately after write.
  await setTimeout(OPEN_DELAY_MS);

  openObsidianPath(noteRelativePath);
}

await run(import.meta.url, () => obsidianJob(parseArgs(OPTIONS)));
