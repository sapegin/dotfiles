// Makes symlinks (or two-way syncs) for dotfiles based on dotfiles.json
// at the repo root, e.g. ~/dotfiles/tilde/.bashrc → ~/.bashrc.
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { gitPullIfClean } from './gitPullIfClean.ts';
import { logError, logWarn } from './log.ts';
import { stripJsonComments } from './strip-json-comments.ts';
import { isIgnored, syncFile, syncFolder } from './syncFile.ts';
import { tildify, untildify } from './tildify.ts';

// TODO: Add --verbose mode that shows all files including ignored ones and ones that didn't need sync

type EntryMode = 'link' | 'sync';

export interface DotfileEntry {
  source: string;
  destination: string;
  mode?: EntryMode;
  /** Regex patterns (substring match); applied to glob matches and folder syncs. */
  ignore?: string[];
  /** Shell command to run after the entry has synced. */
  runAfter?: string;
}

const QUESTION_MARK = '\u001B[33m?\u001B[0m';
const HOME = os.homedir();
const REPO_ROOT = path.join(HOME, 'dotfiles');
const CONFIG_FILE = path.join(REPO_ROOT, 'dotfiles.json');
/** Always-on ignore patterns, merged with each entry's `ignore`. */
const BASE_IGNORE = ['\\.DS_Store$'];

let pushedBack = 0;
/** Git repos already pulled this run, so each is pulled at most once. */
const pulledRepos = new Set<string>();

function isGlob(pattern: string): boolean {
  return pattern.includes('*');
}

/** Walk up from `start` to the nearest directory containing `.git`. */
function findGitRoot(start: string): string | undefined {
  let dir = start;
  while (true) {
    if (fs.existsSync(path.join(dir, '.git'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}

/**
 * Pull the Git repo containing `source` at most once per run. The dotfiles repo
 * itself is skipped (you don't auto-pull the repo you're editing) and sources
 * outside any repo are ignored.
 */
function pullSourceRepo(source: string): void {
  const cwd =
    fs.existsSync(source) && fs.statSync(source).isDirectory()
      ? source
      : path.dirname(source);
  const repoRoot = findGitRoot(cwd);
  if (!repoRoot || repoRoot === REPO_ROOT || pulledRepos.has(repoRoot)) {
    return;
  }
  pulledRepos.add(repoRoot);
  console.log(`🔄 Pulling ${tildify(repoRoot)}…`);
  gitPullIfClean(repoRoot);
}

/** Run an entry's optional follow-up shell command. */
function runAfterCommand(entry: DotfileEntry): void {
  if (entry.runAfter) {
    console.log(`   ⚙ ${entry.runAfter}`);
    execSync(entry.runAfter, { stdio: 'inherit' });
  }
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
  const source = untildify(entry.source);
  const destination = untildify(entry.destination);

  // Trailing slash on `source` (raw, before normalization) means: two-way sync
  // the whole folder via `syncFolder`. Only valid with `mode: "sync"`.
  const sourceIsFolder = entry.source.endsWith('/');
  const sourceIsGlob = isGlob(source);
  const ignorePatterns = [...BASE_IGNORE, ...(entry.ignore ?? [])];

  pullSourceRepo(source);

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
    runAfterCommand(entry);
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

  let didProcessEntry = false;

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
      didProcessEntry = true;
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
    didProcessEntry = true;

    console.log(` ${tildify(destinationPath)}`);
  }

  if (didProcessEntry) {
    runAfterCommand(entry);
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
