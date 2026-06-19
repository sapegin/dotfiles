import { execFileSync, execSync } from 'node:child_process';
import { log } from './theme.ts';

/**
 * Exits with code 1 if the current directory is not inside a Git repository.
 */
export function assertGitRepo(): void {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      stdio: 'ignore',
    });
  } catch {
    process.exit(1);
  }
}

/**
 * Returns the current branch name, or undefined when in detached HEAD state.
 */
export function getCurrentBranch(): string | undefined {
  const branch = execSync('git branch --show-current', {
    encoding: 'utf8',
  }).trim();
  return branch || undefined;
}

/**
 * Returns the value of a Git config key, or undefined if not set.
 */
export function getGitConfig(key: string): string | undefined {
  try {
    return (
      execSync(`git config ${key}`, { encoding: 'utf8' }).trim() || undefined
    );
  } catch {
    return undefined;
  }
}

/**
 * Returns the upstream tracking ref for a branch (defaults to the current
 * branch). Returns undefined if no upstream is configured.
 */
export function getUpstreamTracking(branch?: string): string | undefined {
  const ref = branch === undefined ? '@{upstream}' : `${branch}@{upstream}`;
  try {
    return (
      execSync(`git rev-parse --abbrev-ref --symbolic-full-name "${ref}"`, {
        encoding: 'utf8',
      }).trim() || undefined
    );
  } catch {
    return undefined;
  }
}

/**
 * Pulls the Git repository at `cwd` if the working tree is clean.
 * Logs a warning and skips the pull if there are uncommitted changes.
 */
export function pullIfClean(cwd: string): void {
  const repoStatus = execSync('git status --porcelain', {
    cwd,
    encoding: 'utf8',
  });
  if (repoStatus.trim() === '') {
    execSync('git pull', { cwd, stdio: 'inherit' });
  } else {
    log.warn(' Working tree is dirty, skipping git pull');
  }
}
