import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { tildify } from './files.ts';
import { ensureVolumeMounted, isVolumeMounted } from './mount.ts';
import { log, prompt } from './tui.ts';

export interface ResticConfig {
  readonly repository: string;
  readonly passwordFile: string;
}

const RESTIC_RETENTION = {
  daily: 7,
  weekly: 4,
  monthly: 12,
  yearly: 5,
} as const;

function getResticEnv(config: ResticConfig): NodeJS.ProcessEnv {
  return {
    ...process.env,
    RESTIC_REPOSITORY: config.repository,
    RESTIC_PASSWORD_FILE: config.passwordFile,
  };
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** One-way mirror from `source/` to `destination/` via rsync. */
function mirrorDirectory(
  source: string,
  destination: string,
  excludes: readonly string[] = []
): void {
  execFileSync(
    'rsync',
    [
      '-a',
      '--delete',
      ...excludes.flatMap((pattern) => ['--exclude', pattern]),
      `${source}/`,
      `${destination}/`,
    ],
    { stdio: 'inherit' }
  );
}

function isResticInstalled(): boolean {
  try {
    execFileSync('restic', ['version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function isResticRepositoryInitialized(config: ResticConfig): boolean {
  const result = spawnSync('restic', ['cat', 'config'], {
    stdio: 'ignore',
    env: getResticEnv(config),
  });
  return result.status === 0;
}

export function runRestic(
  args: readonly string[],
  config: ResticConfig
): void {
  execFileSync('restic', args, {
    stdio: 'inherit',
    env: getResticEnv(config),
  });
}

function runResticForget(config: ResticConfig): void {
  runRestic(
    [
      'forget',
      '--keep-daily',
      String(RESTIC_RETENTION.daily),
      '--keep-weekly',
      String(RESTIC_RETENTION.weekly),
      '--keep-monthly',
      String(RESTIC_RETENTION.monthly),
      '--keep-yearly',
      String(RESTIC_RETENTION.yearly),
      '--prune',
    ],
    config
  );
}

/**
 * Ensure a restic password file exists, creating it interactively when missing.
 */
export async function ensureResticPasswordFile(
  passwordFile: string,
  commandName: string
): Promise<void> {
  if (fs.existsSync(passwordFile)) {
    return;
  }

  if (process.stdin.isTTY !== true) {
    throw new Error(
      `Password file is missing: ${tildify(passwordFile)}. Run \`${commandName}\` once in a terminal to create it.`
    );
  }

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

  fs.mkdirSync(path.dirname(passwordFile), { recursive: true });
  fs.writeFileSync(passwordFile, password, { mode: 0o600 });
  fs.chmodSync(passwordFile, 0o600);
  log.heading(`Saved password to ${tildify(passwordFile)}`);
}

/** Verify restic is installed, the password file exists, and the repo volume is mounted. */
export async function ensureResticReady(
  config: ResticConfig,
  commandName: string,
  repositoryMountPoint: string
): Promise<void> {
  if (isResticInstalled() === false) {
    throw new Error('restic is not installed: brew install restic');
  }

  await ensureResticPasswordFile(config.passwordFile, commandName);
  ensureVolumeMounted(repositoryMountPoint);
}

/** Back up sources, then apply the retention policy. */
export async function runResticBackup(
  config: ResticConfig,
  sources: readonly string[],
  excludes: readonly string[],
  resolveSource: (source: string) => string,
  repositoryMountPoint: string,
  commandName: string,
  writeLog: (message: string) => void
): Promise<void> {
  await ensureResticReady(config, commandName, repositoryMountPoint);

  writeLog('Starting restic backup');

  if (isResticRepositoryInitialized(config) === false) {
    log.heading('Initializing repository…');
    runRestic(['init'], config);
  }

  runRestic(
    [
      'backup',
      ...sources.map(resolveSource),
      ...excludes.flatMap((pattern) => ['--exclude', pattern]),
    ],
    config
  );

  runResticForget(config);

  writeLog('Restic backup completed');
}

/**
 * Mirror source volumes to a destination drive. Skips when the destination
 * drive is not mounted. Each job mounts and copies independently so one failing
 * share does not block the others.
 *
 * @returns `false` when any job fails; `true` when all jobs succeed or the
 *   destination drive is absent.
 */
export function runVolumeMirrors(
  destinationDrive: string,
  jobs: readonly {
    source: string;
    destination: string;
    excludes?: readonly string[];
  }[],
  writeLog: (message: string) => void
): boolean {
  if (isVolumeMounted(destinationDrive) === false) {
    writeLog(`${destinationDrive} not mounted; skipping volume mirror`);
    return true;
  }

  writeLog('Starting volume mirror');

  let mirrorFailed = false;

  for (const job of jobs) {
    try {
      ensureVolumeMounted(job.source);
      mirrorDirectory(job.source, job.destination, job.excludes ?? []);
    } catch (error) {
      mirrorFailed = true;
      writeLog(`Volume mirror failed for ${job.source}: ${formatError(error)}`);
    }
  }

  if (mirrorFailed === false) {
    writeLog('Volume mirror completed');
  }

  return mirrorFailed === false;
}
