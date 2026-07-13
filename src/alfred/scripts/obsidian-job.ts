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
import { parseArgs } from '../../util/args.ts';
import { atomicWrite, dirs } from '../../util/files.ts';
import { openObsidianPath } from '../../util/obsidian.ts';
import { formatLocalDate } from '../../util/time.ts';

const JOBS_DIR = path.join(dirs.obsidianVault, 'Jobs/Applications');
const OPEN_DELAY_MS = 500;

const args = parseArgs([
  {
    name: 'title',
    positional: true,
  },
]);

const title = args.title?.trim() ?? '';

if (title === '') {
  process.exit(0);
}

function sanitizeFileName(name: string): string {
  return name.replaceAll(/[/\\:*?"<>|]/g, '').trim();
}

const fileName = sanitizeFileName(title);

if (fileName === '') {
  process.exit(0);
}

const notePath = path.join(JOBS_DIR, `${fileName}.md`);
const noteRelativePath = path.join('Jobs/Applications', `${fileName}.md`);

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

try {
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
} catch (error) {
  console.error(error);
  process.exit(1);
}
