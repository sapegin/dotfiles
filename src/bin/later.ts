// Appends a contextual task or idea to the Obsidian Later inbox.
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { dirs } from '../util/files.ts';
import { getCurrentBranch, getGitRepoRoot } from '../util/git.ts';
import { formatLocalDateTime } from '../util/time.ts';
import { run } from '../util/tui.ts';

const OPTIONS = [
  { name: 'heading', positional: true, required: true },
  { name: 'paragraph', positional: true, required: true },
] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

const LATER_FILE = path.join(dirs.obsidianVault, '0-Inbox/Later.md');

/** Append a contextual record to the Obsidian Later inbox. */
export async function later(
  options: Options,
  laterFile = LATER_FILE,
  cwd = process.cwd(),
  now = new Date()
): Promise<void> {
  const heading = options.heading.trim().replaceAll(/\s+/g, ' ');
  const paragraph = options.paragraph.trim();
  if (heading === '' || paragraph === '') {
    throw new Error('Heading and paragraph must not be empty.');
  }

  const repositoryRoot = getGitRepoRoot(cwd);
  const repository = path.basename(repositoryRoot);
  const branch = getCurrentBranch(cwd);
  const timestamp = formatLocalDateTime(now);
  const entry = `## ${heading}\n\n${timestamp} — ${repository} on ${branch}\n\n${paragraph}`;

  let content = '';
  try {
    content = await fs.readFile(laterFile, 'utf8');
  } catch (error) {
    if (
      error instanceof Error === false ||
      'code' in error === false ||
      error.code !== 'ENOENT'
    ) {
      throw error;
    }
  }

  const separator = content.trim() === '' ? '' : '\n\n';
  await fs.writeFile(laterFile, `${content.trimEnd()}${separator}${entry}\n`);
}

await run(import.meta.url, () => later(parseArgs(OPTIONS)));
