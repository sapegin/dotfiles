/*
 * Appends a quick note to the Obsidian inbox.
 *
 * Author: Artem Sapegin, sapegin.me
 * License: MIT
 * https://github.com/sapegin/dotfiles
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { atomicWrite, dirs } from '../util/files.ts';
import { formatLocalDateTime } from '../util/time.ts';
import { run } from '../util/tui.ts';

const OPTIONS = [
  {
    name: 'text',
    positional: true,
  },
] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

const QUICKIES_FILE = path.join(dirs.obsidianVault, '0-Inbox/Quickies.md');

/** Append a timestamped line to the Obsidian Quickies inbox. */
export async function obsidianQuickie(options: Options): Promise<void> {
  const text = options.text?.trim() ?? '';

  if (text === '') {
    return;
  }

  const timestamp = formatLocalDateTime(new Date());
  const newEntry = `* ${timestamp} — ${text}`;

  await atomicWrite(QUICKIES_FILE, async (tempFile) => {
    let content = '';
    try {
      content = await fs.readFile(QUICKIES_FILE, 'utf8');
    } catch (error) {
      if (
        error instanceof Error === false ||
        'code' in error === false ||
        error.code !== 'ENOENT'
      ) {
        throw error;
      }
    }

    const newContent = content.trimEnd() + (content ? '\n' : '') + newEntry;
    await fs.writeFile(tempFile, newContent);
  });
}

await run(import.meta.url, () => obsidianQuickie(parseArgs(OPTIONS)));
