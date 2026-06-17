import { execSync } from 'node:child_process';
import { log } from './theme.ts';

/**
 * Pulls the Git repository if it's clean. Logs a warning otherwise.
 */
export function gitPullIfClean(cwd: string) {
  const repoStatus = execSync('git status --porcelain', {
    cwd,
    encoding: 'utf8',
  });
  if (repoStatus.trim() === '') {
    execSync('git pull', { cwd, stdio: 'inherit' });
  } else {
    log.warn('⚠️ Working tree is dirty, skipping git pull');
  }
}
