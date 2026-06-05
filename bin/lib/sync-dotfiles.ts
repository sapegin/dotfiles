// Makes symlinks (or two-way syncs) for dotfiles based on dotfiles.json
// at the repo root, e.g. ~/dotfiles/tilde/.bashrc → ~/.bashrc.
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { logError, logWarn } from './log.ts';
import { stripJsonComments } from './strip-json-comments.ts';
import { isIgnored, syncFile, syncFolder } from './syncFile.ts';

// TODO: Add --verbose mode that shows all files including ignored ones and ones that didn't need sync

type EntryMode = 'link' | 'sync';

interface DotfileEntry {
  source: string;
  destination: string;
  mode?: EntryMode;
  /** Regex patterns (substring match); applied to glob matches and folder syncs. */
  ignore?: string[];
}

const QUESTION_MARK = '\u001B[33m?\u001B[0m';
const HOME = os.homedir();
const REPO_ROOT = path.join(HOME, 'dotfiles');
const CONFIG_FILE = path.join(REPO_ROOT, 'dotfiles.json');
/** Always-on ignore patterns, merged with each entry's `ignore`. */
const BASE_IGNORE = ['\\.DS_Store$'];

let pushedBack = 0;

function expandPath(input: string): string {
  if (input === '~') {
    return HOME;
  }
  if (input.startsWith('~/')) {
    return path.join(HOME, input.slice(2));
  }
  return input;
}

function isGlob(pattern: string): boolean {
  return pattern.includes('*');
}

function readConfig(): DotfileEntry[] {
  const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
  return JSON.parse(stripJsonComments(raw)) as DotfileEntry[];
}

function isSymlinkTo(link: string, dest: string): boolean {
  const statLink = fs.lstatSync(link);
  if (statLink.isSymbolicLink() === false) {
    return false;
  }

  return fs.realpathSync(link) === fs.realpathSync(dest);
}

async function confirmAction(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question(`${QUESTION_MARK} ${message} (y/N): `);
    const response = answer.toLowerCase().trim();
    return response === 'y' || response === 'yes';
  } finally {
    rl.close();
  }
}

async function syncEntry(entry: DotfileEntry): Promise<void> {
  const mode: EntryMode = entry.mode ?? 'link';
  const source = expandPath(entry.source);
  const destination = expandPath(entry.destination);
  // Trailing slash on `source` (raw, before normalization) means: two-way sync
  // the whole folder via `syncFolder`. Only valid with `mode: "sync"`.
  const sourceIsFolder = entry.source.endsWith('/');
  const sourceIsGlob = isGlob(source);
  const ignorePatterns = [...BASE_IGNORE, ...(entry.ignore ?? [])];

  if (sourceIsFolder) {
    if (mode !== 'sync') {
      logWarn(
        `⚠ ${source}\n  ↪ Trailing "/" requires \`mode: "sync"\`; skipping.`
      );
      return;
    }
    if (fs.existsSync(source) === false) {
      logError(`✕ ${source}\n  ↪ Source not found!`);
      return;
    }
    const results = await syncFolder(source, destination, ignorePatterns);
    for (const { result } of results) {
      if (result === 'pushed') {
        pushedBack++;
      }
    }
    return;
  }

  const sourcePaths = sourceIsGlob
    ? fs
        .globSync(source, { withFileTypes: true })
        .filter(
          (dirent) =>
            !isIgnored(dirent.name, ignorePatterns, dirent.isDirectory())
        )
        .map((dirent) => path.join(dirent.parentPath, dirent.name))
    : [source];

  for (const sourcePath of sourcePaths) {
    const destinationPath = sourceIsGlob
      ? path.join(destination, path.basename(sourcePath))
      : destination;

    // Check that the source exists
    if (fs.existsSync(sourcePath) === false) {
      logError(`✕ ${sourcePath}\n  ↪ Source not found!`);
      continue;
    }

    if (mode === 'sync') {
      const result = await syncFile(sourcePath, destinationPath);
      if (result === 'pushed') {
        pushedBack++;
      }
      continue;
    }

    // Check that we aren't overwriting anything
    if (fs.existsSync(destinationPath)) {
      // Already a symlink to dotfiles?
      if (isSymlinkTo(destinationPath, sourcePath)) {
        continue;
      }

      // Should overwrite?
      const shouldOverwrite = await confirmAction(
        `File already exists: ${destinationPath}. Overwrite?`
      );
      if (shouldOverwrite === false) {
        console.log('Skipping…');
        continue;
      }

      // Remove
      fs.rmSync(destinationPath, { recursive: true, force: true });
    }

    // Create a folder if needed
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });

    // Create a symlink
    fs.symlinkSync(sourcePath, destinationPath);

    console.log(` ${destinationPath}`);
  }
}

async function main(): Promise<void> {
  console.log('Syncing dotfiles…');
  const entries = readConfig();
  for (const entry of entries) {
    await syncEntry(entry);
  }
  if (pushedBack > 0) {
    console.log();
    console.log(
      `💿 ${pushedBack} files pushed back to the source; commit and push them.`
    );
  }
  console.log('Done.');
}

try {
  await main();
} catch (error) {
  console.error();
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
}
