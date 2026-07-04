// Makes symlinks (or two-way syncs) for dotfiles based on dotfiles.json
// at the repo root, e.g. ~/dotfiles/tilde/.bashrc → ~/.bashrc.
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { dirs, untildify } from '../util/files.ts';
import { findGitRoot, pullIfClean } from '../util/git.ts';
import { confirmYesNo } from '../util/prompt.ts';
import { run } from '../util/run.ts';
import { stripJsonComments } from '../util/stripJsonComments.ts';
import {
  isIgnored,
  syncFile,
  syncFolder,
  syncLink,
  didFilesChange,
  type SyncEntry,
} from '../util/sync.ts';
import { log } from '../util/theme.ts';

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

const CONFIG_FILE = path.join(dirs.dotfiles, 'dotfiles.json');
/** Always-on ignore patterns, merged with each entry's `ignore`. */
const BASE_IGNORE = ['\\.DS_Store$'];

/** Git repos already pulled this run, so each is pulled at most once. */
const pulledRepos = new Set<string>();

function isGlob(pattern: string): boolean {
  return pattern.includes('*');
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
  if (!repoRoot || repoRoot === dirs.dotfiles || pulledRepos.has(repoRoot)) {
    return;
  }
  pulledRepos.add(repoRoot);
  pullIfClean(repoRoot);
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
      log.warn(
        `⚠ ${source}\n  ↪ Trailing "/" requires \`mode: "sync"\`; skipping.`
      );
      return;
    }
    try {
      await fs.access(source);
    } catch {
      log.error(`✕ ${source}\n  ↪ Source not found!`);
      return;
    }
    results.push(
      ...(await syncFolder(
        source,
        destinationDir ?? destination,
        ignorePatterns
      ))
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
      results.push(await syncLink(sourcePath, destinationPath, confirmYesNo));
    }
  }

  runAfterCommand(entry, results);
}

async function main() {
  console.log('Syncing dotfiles…\n');
  const entries = await readConfig();
  for (const entry of entries) {
    await syncEntry(entry);
  }
}

await run(main, { printDone: true });
