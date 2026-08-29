// Unattended backups: Mac → Synology NAS (restic), then NAS → external drive (rsync).
//
// - Run a backup now:
//
// `backup`
//
// - Install the nightly LaunchAgent (runs at 03:00):
//
// `backup install`
//
// - Remove the LaunchAgent:
//
// `backup uninstall`
//
// - List snapshots:
//
// `backup snapshots`
//
// - Find a file in backups:
//
// `backup find --long "{{filename}}"`
//
// - Restore the latest snapshot:
//
// `backup restore latest --target ~/Restore`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import {
  ensureResticReady,
  runRestic,
  runResticBackup,
  runVolumeMirrors,
  type ResticConfig,
} from '../util/backup.ts';
import { dirs } from '../util/files.ts';
import {
  installLaunchAgent,
  uninstallLaunchAgent,
} from '../util/launchAgent.ts';
import { formatLocalTimestamp } from '../util/time.ts';
import { run } from '../util/tui.ts';

const OPTIONS = [{ name: 'args', rest: true }] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

const RESTIC_CONFIG: ResticConfig = {
  repository: path.join(dirs.nasStuffses, 'Backups/restic'),
  passwordFile: path.join(dirs.home, '.config/restic/password'),
};

const RESTIC_SOURCES = [dirs.obsidianVault, dirs.iCloud];

// Restic matches each pattern against a file's absolute path on whole path
// components, so a slash-free name like `.obsidian` excludes any directory
// named exactly `.obsidian` at any depth. A leading `/` would anchor to the
// root.
const RESTIC_EXCLUDES = [
  '.obsidian', // Synced separately via dotfiles
  '.trash', // Obsidian trash
] as const;

const NAS_MIRROR_EXCLUDES = [
  '.DS_Store',
  '@eaDir',
  '#recycle',
  '.@__thumb',
  'Thumbs.db',
  '.TemporaryItems',
] as const;

const NAS_MIRROR_JOBS = [
  {
    source: dirs.nasPhotos,
    destination: path.join(dirs.nasBackupDrive, 'Photos'),
    excludes: [...NAS_MIRROR_EXCLUDES, 'Backup/Imports'],
  },
  {
    source: dirs.nasStuffses,
    destination: path.join(dirs.nasBackupDrive, 'Stuffses'),
    excludes: NAS_MIRROR_EXCLUDES,
  },
] as const;

const BACKUP_HOUR = 3;
const BACKUP_MINUTE = 0;

const LABEL = 'me.sapegin.backup';
const PROGRAM = path.join(dirs.dotfiles, 'bin/symlinks/backup');
const LOG_FILE = path.join(dirs.home, 'Library/Logs/backup.log');
const ERR_FILE = path.join(dirs.home, 'Library/Logs/backup.err');

function logLine(message: string): void {
  // Nightly runs capture stdout into ~/Library/Logs/backup.log via launchd.
  console.log(`${formatLocalTimestamp(new Date())} ${message}`);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runBackup(): Promise<boolean> {
  logLine('Starting backup');

  let resticFailed = false;
  let nasMirrorFailed = false;

  try {
    await runResticBackup(
      RESTIC_CONFIG,
      RESTIC_SOURCES,
      RESTIC_EXCLUDES,
      // Restic stores symlinks without following them; the Obsidian vault is a
      // symlink into iCloud.
      fs.realpathSync,
      dirs.nasStuffses,
      'backup',
      logLine
    );
  } catch (error) {
    resticFailed = true;
    logLine(`Restic failed: ${formatError(error)}`);
  }

  if (
    runVolumeMirrors(dirs.nasBackupDrive, NAS_MIRROR_JOBS, logLine) === false
  ) {
    nasMirrorFailed = true;
  }

  if (resticFailed || nasMirrorFailed) {
    return false;
  }

  logLine('Backup completed');
  return true;
}

function install(): void {
  installLaunchAgent({
    label: LABEL,
    program: PROGRAM,
    hour: BACKUP_HOUR,
    minute: BACKUP_MINUTE,
    logFile: LOG_FILE,
    errFile: ERR_FILE,
  });
}

function uninstall(): void {
  uninstallLaunchAgent(LABEL);
}

export async function backup(options: Options): Promise<void> {
  const [command, ...restArgs] = options.args;

  if (command === 'install') {
    install();
  } else if (command === 'uninstall') {
    uninstall();
  } else if (options.args.length === 0) {
    if ((await runBackup()) === false) {
      process.exit(1);
    }
  } else {
    await ensureResticReady(RESTIC_CONFIG, 'backup', dirs.nasStuffses);
    runRestic([command, ...restArgs], RESTIC_CONFIG);
  }
}

await run(import.meta.url, () => backup(parseArgs(OPTIONS)));
