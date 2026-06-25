// Unattended restic backup to the Synology NAS.
//
// - Run a backup now:
//
// `backup`
//
// - Install the nightly LaunchAgent (runs at 03:00):
//
// `backup --install`
//
// - Remove the LaunchAgent:
//
// `backup --uninstall`
//
// - List snapshots:
//
// `restic snapshots`
//
// - Restore the latest snapshot:
//
// `restic restore latest --target ~/Restore`
//
// - Prerequisite: install restic (the password is set on the first run):
//
// `brew install restic`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { parseArgs } from '../util/args.ts';
import { dirs } from '../util/consts.ts';
import {
  installLaunchAgent,
  uninstallLaunchAgent,
} from '../util/launchAgent.ts';
import { log } from '../util/theme.ts';
import { tildify } from '../util/tildify.ts';

// Configuration

const SOURCES = [dirs.obsidianVault];

// Glob patterns excluded from every source. Restic matches each pattern against
// a file's absolute path on whole path components, so a slash-free name like
// `.obsidian` excludes any directory named exactly `.obsidian` (and its
// contents) at any depth, but not, say, `.obsidian-backup`. A leading slash
// would anchor the pattern to the root instead.
const EXCLUDES = [
  '.obsidian', // Synced separately via dotfiles
  '.trash', // Obsidian trash
];

// The repository lives on the Synology, reached over SMB. macOS mounts the
// share under /Volumes using the credentials saved in the Keychain, so restic
// can use its plain `local` backend against the mount point.
const SHARE_URL = 'smb://Hippopotamus.local/Stuffses';
const MOUNT_POINT = '/Volumes/Stuffses';
const DESTINATION = path.join(MOUNT_POINT, 'Backups/restic');

const PASSWORD_FILE = path.join(dirs.home, '.config/restic/password');

const KEEP_DAILY = 7;
const KEEP_WEEKLY = 4;
const KEEP_MONTHLY = 12;
const KEEP_YEARLY = 5;

const BACKUP_HOUR = 3;
const BACKUP_MINUTE = 0;

// LaunchAgent

const LABEL = 'me.sapegin.backup';
const PROGRAM = path.join(dirs.dotfiles, 'bin/symlinks/backup');
const LOG_FILE = path.join(dirs.home, 'Library/Logs/backup.log');
const ERR_FILE = path.join(dirs.home, 'Library/Logs/backup.err');

const resticEnv = {
  ...process.env,
  RESTIC_REPOSITORY: DESTINATION,
  RESTIC_PASSWORD_FILE: PASSWORD_FILE,
};

function timestamp(): string {
  // The Swedish locale renders local time as `YYYY-MM-DD HH:MM:SS`; keep
  // everything up to the minute.
  return new Date().toLocaleString('sv').slice(0, 16);
}

function logLine(message: string): void {
  // Nightly runs capture stdout into ~/Library/Logs/backup.log via launchd.
  console.log(`${timestamp()} ${message}`);
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

function isShareMounted(): boolean {
  const result = spawnSync('mount', { encoding: 'utf8' });
  return result.stdout.includes(` on ${MOUNT_POINT} (smbfs`);
}

// Ensure the SMB share is mounted before touching the repository. Without this
// guard restic's local backend would silently create the repo on the internal
// disk when the share is offline.
function ensureShareMounted(): void {
  if (isShareMounted()) {
    return;
  }
  log.heading('Mounting backup share…');
  // `mount volume` uses the Keychain credentials and waits until the share is
  // mounted (it creates the /Volumes mount point itself).
  execFileSync('osascript', ['-e', `mount volume "${SHARE_URL}"`], {
    stdio: 'inherit',
  });
  if (isShareMounted() === false) {
    throw new Error(`Failed to mount ${SHARE_URL}`);
  }
}

function isRepositoryInitialized(): boolean {
  const result = spawnSync('restic', ['cat', 'config'], {
    stdio: 'ignore',
    env: resticEnv,
  });
  return result.status === 0;
}

async function prompt(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    return await rl.question(query);
  } finally {
    rl.close();
  }
}

// Prompt for a new repository password and store it with private permissions.
async function createPasswordFile(): Promise<void> {
  log.heading('No restic password found — let’s create one.');
  console.log(
    'This password encrypts the whole repository. Store a copy somewhere safe:\n' +
      'if you lose it, the backups are unrecoverable.\n'
  );

  const password = await prompt('New password: ');
  if (password.length === 0) {
    throw new Error('Password must not be empty');
  }
  if ((await prompt('Repeat password: ')) !== password) {
    throw new Error('Passwords do not match');
  }

  fs.mkdirSync(path.dirname(PASSWORD_FILE), { recursive: true });
  fs.writeFileSync(PASSWORD_FILE, password, { mode: 0o600 });
  fs.chmodSync(PASSWORD_FILE, 0o600);
  log.heading(`Saved password to ${tildify(PASSWORD_FILE)}`);
}

async function backup(): Promise<void> {
  // Step 1: restic must be installed.
  if (isResticInstalled() === false) {
    throw new Error('restic is not installed: brew install restic');
  }

  // Step 2: the password file must exist. Create it interactively on first run;
  // refuse to prompt when there is no terminal (e.g. the nightly LaunchAgent).
  if (fs.existsSync(PASSWORD_FILE) === false) {
    if (process.stdin.isTTY !== true) {
      throw new Error(
        `Password file is missing: ${tildify(PASSWORD_FILE)}. Run \`backup\` once in a terminal to create it.`
      );
    }
    await createPasswordFile();
  }

  // Step 3: the backup share must be mounted.
  ensureShareMounted();

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

const args = parseArgs([
  { name: 'install', type: 'boolean', default: false },
  { name: 'uninstall', type: 'boolean', default: false },
]);

try {
  if (args.install) {
    install();
  } else if (args.uninstall) {
    uninstall();
  } else {
    await backup();
  }
} catch (error) {
  // `readline/promises` throws this when the user presses Ctrl+C at a prompt.
  if (error instanceof Error && error.name === 'AbortError') {
    process.exit(130);
  }
  log.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
