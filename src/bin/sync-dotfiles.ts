// Makes symlinks (or two-way syncs) for dotfiles based on dotfiles.json
// at the repo root, e.g. ~/dotfiles/tilde/.bashrc → ~/.bashrc.
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { gitPullIfClean } from '../util/gitPullIfClean.ts';
import { logError, logWarn } from '../util/log.ts';
import { stripJsonComments } from '../util/stripJsonComments.ts';
import {
  isIgnored,
  syncFile,
  syncFolder,
  syncLink,
  didFilesChange,
  type SyncEntry,
} from '../util/sync.ts';
import { tildify, untildify } from '../util/tildify.ts';

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

/** Git repos already pulled this run, so each is pulled at most once. */
const pulledRepos = new Set<string>();

function isGlob(pattern: string): boolean {
  return pattern.includes('*');
}

/** Walk up from `start` to the nearest directory containing `.git`. */
async function findGitRoot(start: string): Promise<string | undefined> {
  let dir = start;
  while (true) {
    try {
      await fs.access(path.join(dir, '.git'));
      return dir;
    } catch {
      // Not a Git root
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
async function pullSourceRepo(source: string): Promise<void> {
  let cwd = path.dirname(source);
  try {
    const stat = await fs.stat(source);
    if (stat.isDirectory()) {
      cwd = source;
    }
  } catch {
    // Use dirname
  }
  const repoRoot = await findGitRoot(cwd);
  if (!repoRoot || repoRoot === REPO_ROOT || pulledRepos.has(repoRoot)) {
    return;
  }
  pulledRepos.add(repoRoot);
  console.log(`\n󰓂 Pulling ${tildify(repoRoot)}…`);
  gitPullIfClean(repoRoot);
}

/** Run an entry's optional follow-up shell command. */
function runAfterCommand(
  entry: DotfileEntry,
  results: readonly SyncEntry[]
): void {
  if (!entry.runAfter || didFilesChange(results) === false) {
    return;
  }

  console.log(`   ⚙ ${entry.runAfter}`);
  execSync(entry.runAfter, { stdio: 'inherit' });
}

async function readConfig(): Promise<DotfileEntry[]> {
  const raw = await fs.readFile(CONFIG_FILE, 'utf8');
  return JSON.parse(stripJsonComments(raw)) as DotfileEntry[];
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
  const destinationDir = destination.endsWith('/')
    ? destination.slice(0, -1)
    : undefined;

  // Trailing slash on `source` (raw, before normalization) means: two-way sync
  // the whole folder via `syncFolder`. Only valid with `mode: "sync"`.
  const sourceIsFolder = entry.source.endsWith('/');
  const sourceIsGlob = isGlob(source);
  const ignorePatterns = [...BASE_IGNORE, ...(entry.ignore ?? [])];

  await pullSourceRepo(source);

  const results: SyncEntry[] = [];

  if (sourceIsFolder) {
    if (mode !== 'sync') {
      logWarn(
        `⚠ ${source}\n  ↪ Trailing "/" requires \`mode: "sync"\`; skipping.`
      );
      return;
    }
    try {
      await fs.access(source);
    } catch {
      logError(`✕ ${source}\n  ↪ Source not found!`);
      return;
    }
    results.push(
      ...(await syncFolder(source, destinationDir ?? destination, ignorePatterns))
    );
    runAfterCommand(entry, results);
    return;
  }

  let sourcePaths: string[];
  if (sourceIsGlob) {
    const globMatches = await Array.fromAsync(
      fs.glob(source, { withFileTypes: true })
    );
    sourcePaths = globMatches
      .filter(
        (dirent) =>
          !isIgnored(dirent.name, ignorePatterns, dirent.isDirectory())
      )
      .map((dirent) => path.join(dirent.parentPath, dirent.name));
  } else {
    sourcePaths = [source];
  }

  for (const sourcePath of sourcePaths) {
    const destinationPath =
      sourceIsGlob || destinationDir !== undefined
        ? path.join(destinationDir ?? destination, path.basename(sourcePath))
        : destination;

    if (mode === 'sync') {
      results.push(await syncFile(sourcePath, destinationPath));
    } else {
      results.push(await syncLink(sourcePath, destinationPath, confirmAction));
    }
  }

  runAfterCommand(entry, results);
}

async function main(): Promise<void> {
  console.log('Syncing dotfiles…\n');

  const entries = await readConfig();
  for (const entry of entries) {
    await syncEntry(entry);
  }

  console.log('\n Done.');
}

try {
  await main();
} catch (error) {
  console.error();
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
}
