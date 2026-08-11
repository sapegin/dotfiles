import { execFileSync } from 'node:child_process';
import { log } from './tui.ts';

/** Open a macOS app, optionally with files, folders, or URLs to open in it. */
export function openApp(app: string, paths: string[] = []): void {
  try {
    execFileSync('open', ['-a', app, ...paths], { stdio: 'inherit' });
  } catch {
    log.warn(`Could not open ${app}.`);
  }
}
