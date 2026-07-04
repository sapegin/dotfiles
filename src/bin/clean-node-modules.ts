// Removes all `node_modules` folders inside the home directory older than 30 days.
//
// - Remove old `node_modules` folders:
//
// `clean-node-modules`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { dirs } from '../util/files.ts';

// TODO: Merge with clean-node-versions

type Stats = Awaited<ReturnType<typeof fs.stat>>;

const MAX_DAYS = 30;
const IGNORE = [
  `${dirs.home}/.config`,
  `${dirs.home}/.npm`,
  `${dirs.home}/.vscode`,
  `${dirs.home}/.cursor`,
  `${dirs.home}/dotfiles`,
  `${dirs.home}/Library`,
  `${dirs.home}/Documents/Library`,
  `${dirs.home}/Movies`,
];

const sizes: number[] = [];

function differenceInDays(timestamp1: number, timestamp2: number): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor(Math.abs(timestamp1 - timestamp2) / msPerDay);
}

function getFolderSize(folderPath: string): number {
  return Number.parseInt(
    execSync(`du -ksc "${folderPath}" | sort -h -r`)
      .toString()
      .split('\t')
      .shift() ?? '0',
    10
  );
}

function getFolderAgeInDays(stats: Stats): number {
  return differenceInDays(Date.now(), Number(stats.mtimeMs));
}

function formatSize(kilobytes: number): string {
  const gigabytes = kilobytes / 1024 / 1024;
  if (gigabytes >= 1) {
    return `${gigabytes.toFixed(2)} GB`;
  }

  const megabytes = kilobytes / 1024;
  if (megabytes >= 1) {
    return `${megabytes.toFixed(2)} MB`;
  }

  return `${kilobytes} KB`;
}

function summ(items: readonly number[]): number {
  return items.reduce((total, item) => total + item, 0);
}

async function safeStat(filepath: string): Promise<Stats | undefined> {
  try {
    return await fs.stat(filepath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

async function safeReaddir(folderPath: string): Promise<string[]> {
  try {
    return await fs.readdir(folderPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EPERM') {
      return [];
    }
    throw error;
  }
}

async function removeFolder(folderPath: string): Promise<void> {
  const size = getFolderSize(folderPath);
  sizes.push(size);

  console.log(`Removing ${folderPath} (${formatSize(size)})`);
  await fs.rm(folderPath, { recursive: true, force: true });
}

async function removeNodeModules(folderPath: string): Promise<void> {
  const stats = await safeStat(folderPath);
  if (
    stats === undefined ||
    !stats.isDirectory() ||
    IGNORE.includes(folderPath)
  ) {
    return;
  }

  const name = path.basename(folderPath);
  if (name === 'node_modules') {
    if (getFolderAgeInDays(stats) > MAX_DAYS) {
      void removeFolder(folderPath);
    }
  } else {
    const folders = await safeReaddir(folderPath);
    await Promise.all(
      folders.map((folder) => removeNodeModules(path.join(folderPath, folder)))
    );
  }
}

async function main(): Promise<void> {
  await removeNodeModules(dirs.home);

  const totalSize = summ(sizes);
  console.log();
  console.log(
    `Removed ${sizes.length} folders, total of ${formatSize(totalSize)} cleared`
  );
}

await main();
