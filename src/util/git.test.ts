import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  getBranchChangeLog,
  getBranchesWithChanges,
  getBranchCommits,
  getCurrentBranch,
  getMainCommits,
  isBranchMerged,
  parseGitLog,
} from './git.ts';

let repoRoot: string;

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

beforeAll(() => {
  repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-'));
  git('init', '--initial-branch=main');
  git('config', 'user.name', 'Standup Test');
  git('config', 'user.email', 'standup@example.com');
  fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'base\n');
  git('add', 'example.txt');
  git('commit', '-m', 'Initial commit');
});

afterAll(() => {
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

describe(getCurrentBranch, () => {
  test('returns the current branch', () => {
    expect(getCurrentBranch(repoRoot)).toBe('main');
  });
});

describe(parseGitLog, () => {
  test('parses tab-separated git log lines', () => {
    expect(parseGitLog('2026-08-01\tFix bug')).toStrictEqual([
      { date: '2026-08-01', subject: 'Fix bug' },
    ]);
  });

  test('returns an empty array for blank output', () => {
    expect(parseGitLog('')).toStrictEqual([]);
    expect(parseGitLog('   \n')).toStrictEqual([]);
  });
});

describe('standup git queries', () => {
  test('lists recent main commits and local branches with unpushed work', () => {
    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'main change\n');
    git('commit', '-am', 'Main change');

    git('switch', '-c', 'feature');
    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'feature change\n');
    git('commit', '-am', 'Feature change');

    git('switch', 'main');

    const options = {
      days: 30,
      author: 'standup@example.com',
      baseBranch: 'main',
    };

    expect(
      getMainCommits(repoRoot, options).some(
        (commit) => commit.subject === 'Main change'
      )
    ).toBe(true);

    const branches = getBranchesWithChanges(repoRoot, options);
    expect(branches.some((entry) => entry.branch === 'feature')).toBe(true);
    expect(
      branches.find((entry) => entry.branch === 'feature')?.commits
    ).toStrictEqual([expect.objectContaining({ subject: 'Feature change' })]);
  });

  test('builds branch change logs from recent unpushed commits', () => {
    const options = {
      days: 30,
      author: 'standup@example.com',
      baseBranch: 'main',
    };

    const changeLog = getBranchChangeLog(repoRoot, 'feature', options);
    expect(changeLog).toContain('Feature change');
    expect(changeLog).not.toContain('Author:');
  });

  test('ignores merge-only commits on branches', () => {
    git('switch', '-c', 'merge-only');
    execFileSync(
      'git',
      ['merge', '--no-ff', 'main', '-m', "Merge branch 'main' into merge-only"],
      { cwd: repoRoot, encoding: 'utf8' }
    );

    const options = {
      days: 30,
      author: 'standup@example.com',
      baseBranch: 'main',
    };

    expect(getBranchCommits(repoRoot, 'merge-only', options)).toStrictEqual([]);
    expect(getBranchChangeLog(repoRoot, 'merge-only', options)).toBe('');
    expect(
      getBranchesWithChanges(repoRoot, options).some(
        (entry) => entry.branch === 'merge-only'
      )
    ).toBe(false);

    git('switch', 'main');
    git('branch', '-D', 'merge-only');
  });

  test('skips local branches already merged into main', () => {
    git('switch', '-c', 'merged-feature');
    fs.writeFileSync(path.join(repoRoot, 'merged.txt'), 'merged work\n');
    git('add', 'merged.txt');
    git('commit', '-m', 'Merged feature work');

    git('switch', 'main');
    execFileSync(
      'git',
      ['merge', '--no-ff', 'merged-feature', '-m', 'Merge merged-feature'],
      { cwd: repoRoot, encoding: 'utf8' }
    );

    const options = {
      days: 30,
      author: 'standup@example.com',
      baseBranch: 'main',
    };

    expect(isBranchMerged(repoRoot, 'merged-feature', 'main')).toBe(true);
    expect(
      getBranchesWithChanges(repoRoot, options).some(
        (entry) => entry.branch === 'merged-feature'
      )
    ).toBe(false);
  });

  test('excludes branches without recent unpushed commits', () => {
    git('switch', 'main');
    execFileSync(
      'git',
      ['merge', '--no-ff', 'feature', '-m', 'Merge feature'],
      { cwd: repoRoot, encoding: 'utf8' }
    );

    expect(
      getBranchesWithChanges(repoRoot, {
        days: 30,
        author: 'standup@example.com',
        baseBranch: 'main',
      })
    ).toStrictEqual([]);
  });

  test('filters branch commits by time window', () => {
    git('switch', '-c', 'old-feature');
    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'old feature\n');
    execFileSync('git', ['commit', '-am', 'Old feature change'], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: '2020-01-01T12:00:00',
        GIT_COMMITTER_DATE: '2020-01-01T12:00:00',
      },
    });

    const options = {
      days: 10,
      author: 'standup@example.com',
      baseBranch: 'main',
    };

    expect(getBranchCommits(repoRoot, 'old-feature', options)).toStrictEqual(
      []
    );
    expect(
      getBranchesWithChanges(repoRoot, options).some(
        (entry) => entry.branch === 'old-feature'
      )
    ).toBe(false);
  });

  test('filters main commits by author and time window', () => {
    const author = 'standup@example.com';
    const recent = getMainCommits(repoRoot, {
      days: 30,
      author,
      baseBranch: 'main',
    });
    expect(recent.some((commit) => commit.subject === 'Main change')).toBe(
      true
    );

    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'dated change\n');
    execFileSync('git', ['commit', '-am', 'Dated change'], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: '2020-01-01T12:00:00',
        GIT_COMMITTER_DATE: '2020-01-01T12:00:00',
      },
    });

    expect(
      getMainCommits(repoRoot, {
        days: 10,
        author,
        baseBranch: 'main',
      }).some((commit) => commit.subject === 'Dated change')
    ).toBe(false);
  });
});
