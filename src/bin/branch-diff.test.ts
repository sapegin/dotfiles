import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

const scriptPath = path.join(import.meta.dirname, 'branch-diff.ts');
let repoRoot: string;

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

function branchDiff(...args: string[]): string {
  return execFileSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

beforeEach(() => {
  repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'branch-diff-'));
  git('init', '--initial-branch=main');
  git('config', 'user.name', 'Branch Diff Test');
  git('config', 'user.email', 'branch-diff@example.com');
  fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'base\n');
  git('add', 'example.txt');
  git('commit', '-m', 'Initial commit');
});

afterEach(() => {
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

describe('branch-diff', () => {
  test('prints a feature branch, file, commit, or main working changes', () => {
    git('switch', '-c', 'feature');
    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'feature\n');
    git('commit', '-am', 'Feature change');
    const featureCommit = git('rev-parse', 'HEAD');
    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'current source\n');

    expect(branchDiff()).toContain('+feature');
    expect(branchDiff()).not.toContain('current source');
    expect(branchDiff('example.txt')).toContain('+current source');
    expect(branchDiff('@example.txt')).toContain('+current source');
    expect(branchDiff(path.join(repoRoot, 'example.txt'))).toContain(
      '+current source'
    );
    expect(branchDiff(featureCommit)).toContain('+feature');
    expect(branchDiff('--include-uncommitted', 'example.txt')).toBe(
      branchDiff('example.txt')
    );
    expect(branchDiff('--include-uncommitted', featureCommit)).toBe(
      branchDiff(featureCommit)
    );

    git('restore', 'example.txt');
    git('switch', 'main');
    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'working main\n');
    fs.writeFileSync(path.join(repoRoot, 'untracked.txt'), 'untracked main\n');

    const mainDiff = branchDiff();
    expect(mainDiff).toContain('+working main');
    expect(mainDiff).toContain('+untracked main');
    expect(branchDiff('--include-uncommitted')).toBe(mainDiff);
  });

  test('includes committed, staged, unstaged, and untracked feature changes', () => {
    git('switch', '-c', 'feature');
    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'feature\n');
    git('commit', '-am', 'Feature change');
    fs.writeFileSync(path.join(repoRoot, 'staged.txt'), 'staged\n');
    git('add', 'staged.txt');
    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'working feature\n');
    fs.writeFileSync(path.join(repoRoot, 'untracked file.txt'), 'untracked\n');
    fs.writeFileSync(path.join(repoRoot, '.gitignore'), '*.ignored\n');
    fs.writeFileSync(path.join(repoRoot, 'debug.ignored'), 'ignored\n');
    const status = git('status', '--porcelain');

    const diff = branchDiff('--include-uncommitted');
    expect(diff).toContain('-base\n+working feature');
    expect(diff).toContain('+staged');
    expect(diff).toContain('+untracked');
    expect(diff).not.toContain('debug.ignored');
    expect(diff.match(/diff --git a\/example.txt/g)).toHaveLength(1);
    expect(git('status', '--porcelain')).toBe(status);

    const committedDiff = branchDiff();
    expect(committedDiff).toContain('+feature');
    expect(committedDiff).not.toContain('working feature');
    expect(committedDiff).not.toContain('staged.txt');
    expect(committedDiff).not.toContain('untracked file.txt');
  });

  test('uses the final working tree when staged and committed edits overlap', () => {
    git('switch', '-c', 'feature');
    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'committed\n');
    git('commit', '-am', 'Feature change');
    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'staged\n');
    git('add', 'example.txt');
    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'final\n');

    const diff = branchDiff('--include-uncommitted');
    expect(diff).toContain('-base\n+final');
    expect(diff).not.toContain('+committed');
    expect(diff).not.toContain('+staged');
    expect(diff.match(/diff --git a\/example.txt/g)).toHaveLength(1);

    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'base\n');
    expect(branchDiff('--include-uncommitted')).toBe('');
  });

  test('compares against the merge base when the base branch advances', () => {
    git('switch', '-c', 'feature');
    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'feature\n');
    git('commit', '-am', 'Feature change');
    git('switch', 'main');
    fs.writeFileSync(path.join(repoRoot, 'base-only.txt'), 'base only\n');
    git('add', 'base-only.txt');
    git('commit', '-m', 'Advance base');
    git('switch', 'feature');

    expect(branchDiff('--include-uncommitted')).toBe(branchDiff());
    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'working feature\n');
    const diff = branchDiff('--include-uncommitted');
    expect(diff).toContain('-base\n+working feature');
    expect(diff).not.toContain('base-only.txt');
  });

  test('preserves working-tree behavior on master', () => {
    git('branch', '-m', 'master');
    fs.writeFileSync(path.join(repoRoot, 'staged.txt'), 'staged master\n');
    git('add', 'staged.txt');
    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'working master\n');
    fs.writeFileSync(
      path.join(repoRoot, 'untracked.txt'),
      'untracked master\n'
    );

    const diff = branchDiff('--include-uncommitted');
    expect(diff).toBe(branchDiff());
    expect(diff).toContain('+staged master');
    expect(diff).toContain('+working master');
    expect(diff).toContain('+untracked master');
  });
});
