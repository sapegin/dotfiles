// Unattended restic backup to the Synology NAS.
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

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { dirs, tildify } from '../util/files.ts';
import {
  installLaunchAgent,
  uninstallLaunchAgent,
} from '../util/launchAgent.ts';
import { ensureVolumeMounted } from '../util/mount.ts';
import { run } from '../util/run.ts';
import { formatLocalTimestamp } from '../util/time.ts';
import { log, prompt } from '../util/tui.ts';

// Folders to backup
const SOURCES = [dirs.obsidianVault, dirs.iCloud];

// Glob patterns excluded from every source. Restic matches each pattern against
// a file's absolute path on whole path components, so a slash-free name like
// `.obsidian` excludes any directory named exactly `.obsidian` (and its
// contents) at any depth, but not, say, `.obsidian-backup`. A leading slash
// would anchor the pattern to the root instead.
const EXCLUDES = [
  '.obsidian', // Synced separately via dotfiles
  '.trash', // Obsidian trash
];

const RESTIC_REPOSITORY = path.join(dirs.nasStuffses, 'Backups/restic');
const RESTIC_PASSWORD_FILE = path.join(dirs.home, '.config/restic/password');

// Retention policy: keep last 7 daily, 4 weekly, 12 monthly and 5 yearly backup
const KEEP_DAILY = 7;
const KEEP_WEEKLY = 4;
const KEEP_MONTHLY = 12;
const KEEP_YEARLY = 5;

// Backup time: 3am every day
const BACKUP_HOUR = 3;
const BACKUP_MINUTE = 0;

// LaunchAgent
const LABEL = 'me.sapegin.backup';
const PROGRAM = path.join(dirs.dotfiles, 'bin/symlinks/backup');
const LOG_FILE = path.join(dirs.home, 'Library/Logs/backup.log');
const ERR_FILE = path.join(dirs.home, 'Library/Logs/backup.err');

const resticEnv = {
  ...process.env,
  RESTIC_REPOSITORY,
  RESTIC_PASSWORD_FILE,
};

function logLine(message: string): void {
  // Nightly runs capture stdout into ~/Library/Logs/backup.log via launchd.
  console.log(`${formatLocalTimestamp(new Date())} ${message}`);
}

function restic(args: readonly string[]): void {
  execFileSync('restic', args, { stdio: 'inherit', env: resticEnv });
}

function isResticInstalled(): boolean {
  try {
    execFileSync('restic', ['version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function isRepositoryInitialized(): boolean {
  const result = spawnSync('restic', ['cat', 'config'], {
    stdio: 'ignore',
    env: resticEnv,
  });
  return result.status === 0;
}

/**
 * Prompt for a new repository password and store it with private permissions.
 */
async function createPasswordFile(): Promise<void> {
  log.heading('No restic password found — let’s create one.');
  console.log(`
This password encrypts the whole repository. Store a copy somewhere safe:
if you lose it, the backups are unrecoverable.
`);

  const password = await prompt('New password: ');
  if (password.length === 0) {
    throw new Error('Password must not be empty');
  }
  if ((await prompt('Repeat password: ')) !== password) {
    throw new Error('Passwords do not match');
  }

  fs.mkdirSync(path.dirname(RESTIC_PASSWORD_FILE), { recursive: true });
  fs.writeFileSync(RESTIC_PASSWORD_FILE, password, { mode: 0o600 });
  fs.chmodSync(RESTIC_PASSWORD_FILE, 0o600);
  log.heading(`Saved password to ${tildify(RESTIC_PASSWORD_FILE)}`);
}

async function ensureResticReady(): Promise<void> {
  if (isResticInstalled() === false) {
    throw new Error('restic is not installed: brew install restic');
  }

  // Create the password file interactively on first run; refuse to prompt when
  // there is no terminal (e.g. the nightly LaunchAgent).
  if (fs.existsSync(RESTIC_PASSWORD_FILE) === false) {
    if (process.stdin.isTTY !== true) {
      throw new Error(
        `Password file is missing: ${tildify(RESTIC_PASSWORD_FILE)}. Run \`backup\` once in a terminal to create it.`
      );
    }
    await createPasswordFile();
  }

  ensureVolumeMounted(dirs.nasStuffses);
}

async function backup(): Promise<void> {
  await ensureResticReady();

  logLine('Starting backup');

  // Step 4: initialize the repository once, on first run.
  if (isRepositoryInitialized() === false) {
    log.heading('Initializing repository…');
    restic(['init']);
  }

  // Step 5: back up all sources. Resolve symlinks first: restic stores a
  // symlink as just the link without descending into it, and the Obsidian vault
  // is a symlink into iCloud.
  restic([
    'backup',
    ...SOURCES.map((source) => fs.realpathSync(source)),
    ...EXCLUDES.flatMap((pattern) => ['--exclude', pattern]),
  ]);

  // Step 6: apply the retention policy and reclaim unused data.
  restic([
    'forget',
    '--keep-daily',
    String(KEEP_DAILY),
    '--keep-weekly',
    String(KEEP_WEEKLY),
    '--keep-monthly',
    String(KEEP_MONTHLY),
    '--keep-yearly',
    String(KEEP_YEARLY),
    '--prune',
  ]);

  logLine('Backup completed');
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

const cliArgs = process.argv.slice(2);
const [command, ...restArgs] = cliArgs;

async function main(): Promise<void> {
  if (command === 'install') {
    install();
  } else if (command === 'uninstall') {
    uninstall();
  } else if (cliArgs.length === 0) {
    await backup();
  } else {
    await ensureResticReady();
    restic([command, ...restArgs]);
  }
}

await run(main);
