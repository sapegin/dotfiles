import { execFileSync } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

/** Check whether a macOS app is currently running, by process name. */
export function isAppRunning(app: string): boolean {
  try {
    execFileSync('pgrep', ['-x', app], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** Quit a macOS app and wait until it has fully exited. */
export async function quitApp(app: string, timeoutMs = 5000): Promise<void> {
  if (isAppRunning(app) === false) {
    return;
  }

  execFileSync('osascript', [
    '-e',
    `tell application ${JSON.stringify(app)} to quit`,
  ]);

  const deadline = Date.now() + timeoutMs;
  while (isAppRunning(app) && Date.now() < deadline) {
    await setTimeout(100);
  }
}

/** Open a macOS app, optionally with files, folders, or URLs to open in it. */
export function openApp(app: string, paths: string[] = []): void {
  execFileSync('open', ['-a', app, ...paths], { stdio: 'inherit' });
}
