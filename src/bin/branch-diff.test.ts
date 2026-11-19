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
  test('prints an explicit file or commit even with pending changes', () => {
    git('switch', '-c', 'feature');
    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'feature\n');
    git('commit', '-am', 'Feature change');
    const featureCommit = git('rev-parse', 'HEAD');
    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'current source\n');

    expect(branchDiff('example.txt')).toContain('+current source');
    expect(branchDiff('@example.txt')).toContain('+current source');
    expect(branchDiff(path.join(repoRoot, 'example.txt'))).toContain(
      '+current source'
    );
    expect(branchDiff(featureCommit)).toContain('+feature');
  });

  test('prints working changes on main and nothing when clean', () => {
    expect(branchDiff()).toBe('');
    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'working main\n');
    fs.writeFileSync(path.join(repoRoot, 'untracked.txt'), 'untracked main\n');

    const mainDiff = branchDiff();
    expect(mainDiff).toContain('+working main');
    expect(mainDiff).toContain('+untracked main');
  });

  test('prints uncommitted changes on a dirty feature branch and the branch diff when clean', () => {
    git('switch', '-c', 'feature');
    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'feature\n');
    git('commit', '-am', 'Feature change');
    fs.writeFileSync(path.join(repoRoot, 'staged.txt'), 'staged\n');
    git('add', 'staged.txt');
    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'working feature\n');
    fs.writeFileSync(path.join(repoRoot, 'untracked file.txt'), 'untracked\n');
    const workingDiff = branchDiff();
    expect(workingDiff).toContain('-feature\n+working feature');
    expect(workingDiff).toContain('+staged');
    expect(workingDiff).toContain('+untracked');
    expect(workingDiff).not.toContain('-base');

    git('restore', '--source=HEAD', '--staged', '--worktree', '--', '.');
    expect(branchDiff()).toContain('+untracked');
    expect(branchDiff()).not.toContain('+feature');

    fs.appendFileSync(
      path.join(repoRoot, '.git', 'info', 'exclude'),
      '\nuntracked file.txt\n'
    );
    const featureDiff = branchDiff();
    expect(featureDiff).toContain('-base\n+feature');
    expect(featureDiff).not.toContain('untracked file.txt');
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

    const diff = branchDiff();
    expect(diff).toContain('-base\n+feature');
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

    const diff = branchDiff();
    expect(diff).toContain('+staged master');
    expect(diff).toContain('+working master');
    expect(diff).toContain('+untracked master');
  });
});
