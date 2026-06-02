// Makes symlinks (and optional copies) for dotfiles based on dotfiles.json
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
import { stripJsonComments } from './strip-json-comments.ts';

interface DotfileEntry {
  source: string;
  destination: string;
  copy?: boolean;
  ignoreFolders?: boolean;
}

const QUESTION_MARK = '\u001B[33m?\u001B[0m';
const HOME = os.homedir();
const REPO_ROOT = path.join(HOME, 'dotfiles');
const CONFIG_FILE = path.join(REPO_ROOT, 'dotfiles.json');
const IGNORE = ['.DS_Store'];

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
  const source = expandPath(entry.source);
  const destination = expandPath(entry.destination);
  const sourceIsGlob = isGlob(source);

  const sourcePaths = sourceIsGlob
    ? fs
        .globSync(source, { withFileTypes: true })
        .filter((dirent) => !(entry.ignoreFolders && dirent.isDirectory()))
        .map((dirent) => path.join(dirent.parentPath, dirent.name))
    : [source];

  for (const sourcePath of sourcePaths) {
    if (IGNORE.includes(path.basename(sourcePath))) {
      continue;
    }

    const destinationPath = sourceIsGlob
      ? path.join(destination, path.basename(sourcePath))
      : destination;

    // Check that the source exists
    if (fs.existsSync(sourcePath) === false) {
      continue;
    }

    // Check that we aren't overwriting anything
    if (fs.existsSync(destinationPath)) {
      if (entry.copy) {
        // Already identical to the source file?
        if (
          fs.lstatSync(destinationPath).isFile() &&
          fs.readFileSync(sourcePath, 'utf8') ===
            fs.readFileSync(destinationPath, 'utf8')
        ) {
          continue;
        }
      } else {
        // Already a symlink to dotfiles?
        if (isSymlinkTo(destinationPath, sourcePath)) {
          continue;
        }
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

    if (entry.copy) {
      // Copy the file
      fs.copyFileSync(sourcePath, destinationPath);
    } else {
      // Create a symlink
      fs.symlinkSync(sourcePath, destinationPath);
    }

    console.log('🦐', sourcePath, '→', destinationPath);
  }
}

async function main(): Promise<void> {
  console.log('Syncing dotfiles…');
  const entries = readConfig();
  for (const entry of entries) {
    await syncEntry(entry);
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
