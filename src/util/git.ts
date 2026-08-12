import { execFileSync, execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { tildify } from './files.ts';
import { log } from './tui.ts';

export interface GitLogEntry {
  readonly date: string;
  readonly subject: string;
}

export interface BranchGitLog {
  readonly branch: string;
  readonly commits: readonly GitLogEntry[];
}

const LOG_FORMAT = '%ad%x09%s';

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
export function getCurrentBranch(cwd?: string): string | undefined {
  const branch = execSync('git branch --show-current', {
    cwd,
    encoding: 'utf8',
  }).trim();
  return branch || undefined;
}

/** Returns the root of the current Git repository. */
export function getGitRepoRoot(cwd?: string): string {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd,
    encoding: 'utf8',
  }).trim();
}

/** Returns the local main or master branch, preferring main. */
export function getBaseBranch(cwd?: string): 'main' | 'master' {
  for (const branch of ['main', 'master'] as const) {
    if (
      spawnSync(
        'git',
        ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`],
        { cwd }
      ).status === 0
    ) {
      return branch;
    }
  }

  throw new Error('Cannot find a local main or master branch.');
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

/** Returns the configured Git author string, preferring email over name. */
export function getGitAuthor(): string {
  const email = getGitConfig('user.email');
  if (email !== undefined) {
    return email;
  }

  const name = getGitConfig('user.name');
  if (name !== undefined) {
    return name;
  }

  throw new Error('Git user.name and user.email are not configured.');
}

/** Parses `git log` lines formatted with tab-separated date and subject. */
export function parseGitLog(output: string): GitLogEntry[] {
  if (output.trim() === '') {
    return [];
  }

  return output.split('\n').map((line) => {
    const [date = '', ...subjectParts] = line.split('\t');
    return {
      date,
      subject: subjectParts.join('\t'),
    };
  });
}

function runGitLog(repoRoot: string, args: readonly string[]): GitLogEntry[] {
  const output = execFileSync('git', ['log', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
  return parseGitLog(output);
}

/** Returns local branch names sorted by most recent commit first. */
export function getLocalBranches(repoRoot: string): string[] {
  return execFileSync(
    'git',
    [
      'for-each-ref',
      '--sort=-committerdate',
      'refs/heads/',
      '--format=%(refname:short)',
    ],
    { cwd: repoRoot, encoding: 'utf8' }
  )
    .split('\n')
    .filter(Boolean);
}

/** Returns the user's commits on the base branch within the last `days` days. */
export function getMainCommits(
  repoRoot: string,
  options: {
    readonly days: number;
    readonly author: string;
    readonly baseBranch: string;
  }
): GitLogEntry[] {
  return runGitLog(repoRoot, [
    options.baseBranch,
    `--since=${options.days} days ago`,
    `--author=${options.author}`,
    `--format=${LOG_FORMAT}`,
    '--date=short',
  ]);
}

/**
 * Returns recent commits by `author` on `branch` that are not yet on
 * `baseBranch`.
 */
export function getBranchCommits(
  repoRoot: string,
  branch: string,
  options: {
    readonly days: number;
    readonly author: string;
    readonly baseBranch: string;
  }
): GitLogEntry[] {
  return runGitLog(repoRoot, [
    `${options.baseBranch}..${branch}`,
    `--since=${options.days} days ago`,
    `--author=${options.author}`,
    '--no-merges',
    `--format=${LOG_FORMAT}`,
    '--date=short',
  ]);
}

/** Returns commit subjects and stats for recent unpushed branch work. */
export function getBranchChangeLog(
  repoRoot: string,
  branch: string,
  options: {
    readonly days: number;
    readonly author: string;
    readonly baseBranch: string;
  }
): string {
  return execFileSync(
    'git',
    [
      'log',
      `${options.baseBranch}..${branch}`,
      `--since=${options.days} days ago`,
      `--author=${options.author}`,
      '--no-merges',
      '--no-color',
      '--format=%s',
      '--stat',
    ],
    { cwd: repoRoot, encoding: 'utf8' }
  ).trim();
}

/**
 * Returns whether `branch` is merged into `baseBranch` — either by history
 * or because both tips produce the same tree (e.g. after a squash merge).
 */
export function isBranchMerged(
  repoRoot: string,
  branch: string,
  baseBranch: string
): boolean {
  if (
    spawnSync('git', ['merge-base', '--is-ancestor', branch, baseBranch], {
      cwd: repoRoot,
    }).status === 0
  ) {
    return true;
  }

  return (
    spawnSync('git', ['diff', '--quiet', baseBranch, branch], {
      cwd: repoRoot,
    }).status === 0
  );
}

/**
 * Returns local branches other than the base branch that have commits by the
 * author within the last `days` days that are not yet merged into the base
 * branch.
 */
export function getBranchesWithChanges(
  repoRoot: string,
  options: {
    readonly days: number;
    readonly author: string;
    readonly baseBranch: string;
  }
): BranchGitLog[] {
  const branches = getLocalBranches(repoRoot).filter(
    (branch) => branch !== options.baseBranch
  );

  const result: BranchGitLog[] = [];
  for (const branch of branches) {
    if (isBranchMerged(repoRoot, branch, options.baseBranch)) {
      continue;
    }

    const commits = getBranchCommits(repoRoot, branch, options);
    if (commits.length > 0) {
      result.push({ branch, commits });
    }
  }

  return result;
}

/**
 * Walks up from `start` to the nearest directory containing `.git`.
 */
export async function findGitRoot(start: string): Promise<string | undefined> {
  let dir = start;
  while (true) {
    try {
      await fs.access(path.join(dir, '.git'));
      return dir;
    } catch {
      // Not a Git root
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
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
 * Returns the exit code from a child_process exec error, or 1.
 */
export function getExecExitCode(error: unknown): number {
  return typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
    ? error.status
    : 1;
}

/**
 * Runs a Git command, forwarding stdio. Exits with Git's status code on failure
 * without printing a Node stack trace.
 */
export function runGit(
  args: readonly string[],
  options?: { cwd?: string }
): void {
  try {
    execFileSync('git', args, { stdio: 'inherit', ...options });
  } catch (error) {
    process.exit(getExecExitCode(error));
  }
}

/**
 * Runs the `pull` helper script. Exits on failure without a Node stack trace;
 * pull prints its own errors.
 */
export function runPull(): void {
  try {
    execFileSync('pull', { stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
}

/**
 * Pulls the Git repository at `cwd` if the working tree is clean.
 * Logs a warning and skips the pull if there are uncommitted changes.
 */
export function pullIfClean(cwd: string): void {
  console.log(`\n↓ Pulling ${tildify(cwd)}…`);
  const repoStatus = execSync('git status --porcelain', {
    cwd,
    encoding: 'utf8',
  });
  if (repoStatus.trim() === '') {
    try {
      execSync('git pull', { cwd, stdio: 'inherit' });
    } catch {
      process.exit(1);
    }
  } else {
    log.warn(' Working tree is dirty, skipping git pull');
  }
}
