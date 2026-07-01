/*
 * Appends a quick note to the Obsidian inbox.
 *
 * Author: Artem Sapegin, sapegin.me
 * License: MIT
 * https://github.com/sapegin/dotfiles
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from '../../util/args.ts';
import { dirs } from '../../util/consts.ts';

const QUICKIES_FILE = path.join(dirs.obsidianVault, '0-Inbox/Quickies.md');

const args = parseArgs([
  {
    name: 'text',
    positional: true,
  },
]);

const text = args.text?.trim() ?? '';

if (text.trim() === '') {
  process.exit(0);
}

/** Format date as `YYYY-MM-DD_HHmm`. */
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 16).replace('T', '_').replace(':', '');
}

try {
  const content = await fs.readFile(QUICKIES_FILE, 'utf8');

  const timestamp = formatDate(new Date());
  const newEntry = `* ${timestamp} — ${text}`;
  const newContent = content.trimEnd() + (content ? '\n' : '') + newEntry;

  await fs.writeFile(QUICKIES_FILE, newContent);
} catch (error) {
  console.error(error);
}
