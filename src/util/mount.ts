import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { log } from './theme.ts';

const NAS_SHARE_ROOT = 'smb://Hippopotamus.local';

/**
 * Check if a given volume mounted.
 */
export function isVolumeMounted(mountPoint: string): boolean {
  const result = spawnSync('mount', { encoding: 'utf8' });
  return result.stdout.includes(` on ${mountPoint} (`);
}

/**
 * Ensure a share on the Synology NAS is mounted before writing to it.
 */
export function ensureVolumeMounted(
  mountPoint: string,
  shareRoot = NAS_SHARE_ROOT
): void {
  const shareUrl = `${shareRoot}/${path.basename(mountPoint)}`;

  if (isVolumeMounted(mountPoint)) {
    return;
  }

  log.heading('Mounting backup share…');

  // `mount volume` uses Keychain credentials and creates the /Volumes mount
  // point itself.
  execFileSync('osascript', ['-e', `mount volume "${shareUrl}"`], {
    stdio: 'inherit',
  });
  if (isVolumeMounted(mountPoint) === false) {
    throw new Error(`Failed to mount ${shareUrl}`);
  }
}
