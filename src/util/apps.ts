import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { log } from './tui.ts';

/** Force-quit a macOS app by process name. No-op if it is not running. */
export function killApp(app: string): void {
  const name = path.basename(app, '.app');
  spawnSync('killall', ['-9', name], { stdio: 'ignore' });
}

/** Open a macOS app, optionally with files, folders, or URLs to open in it. */
export function openApp(app: string, paths: string[] = []): void {
  try {
    execFileSync('open', ['-a', app, ...paths], { stdio: 'inherit' });
  } catch {
    log.warn(`Could not open ${app}.`);
  }
}

/** Force-quit a macOS app if running, then open it. */
export function restartApp(app: string): void {
  killApp(app);
  openApp(app);
}
