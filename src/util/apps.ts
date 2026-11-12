import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { log } from './tui.ts';

const APP_EXIT_TIMEOUT_MS = 3000;
const APP_EXIT_POLL_MS = 50;
/** Brief pause after exit so LaunchServices can settle before relaunch. */
const APP_LAUNCHD_SETTLE_MS = 250;

/** Force-quit a macOS app by process name. No-op if it is not running. */
export function killApp(app: string): void {
  const name = path.basename(app, '.app');
  spawnSync('killall', ['-9', name], { stdio: 'ignore' });
}

/** Open a macOS app, optionally with files, folders, or URLs to open in it. */
export function openApp(app: string, paths: string[] = []): void {
  try {
    // Prefer `open /path/App.app` for bundles; `open -a` after a recent
    // force-quit can race LaunchServices and fail with -600.
    const args =
      paths.length === 0 && app.endsWith('.app')
        ? [app]
        : ['-a', app, ...paths];
    execFileSync('open', args, { stdio: 'inherit' });
  } catch {
    log.warn(`Could not open ${app}.`);
  }
}

function isAppProcessRunning(name: string): boolean {
  return spawnSync('pgrep', ['-x', name], { stdio: 'ignore' }).status === 0;
}

/** Wait until `pgrep -x` no longer sees the process (or timeout). */
async function waitUntilAppExited(name: string): Promise<void> {
  const deadline = Date.now() + APP_EXIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (isAppProcessRunning(name) === false) {
      return;
    }
    await setTimeout(APP_EXIT_POLL_MS);
  }

  if (isAppProcessRunning(name)) {
    log.warn(`${name} did not exit after ${APP_EXIT_TIMEOUT_MS}ms.`);
  }
}

/**
 * Force-quit a macOS app if running, then open it.
 * Waits for the process (and a brief launchd settle) so relaunch after
 * `killall -9` does not hit `_LSOpenURLs… error -600`.
 */
export async function restartApp(app: string): Promise<void> {
  const name = path.basename(app, '.app');
  killApp(app);
  await waitUntilAppExited(name);
  await setTimeout(APP_LAUNCHD_SETTLE_MS);
  openApp(app);
}
