import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const scriptPath = path.join(import.meta.dirname, 'branch-diff.ts');
let repoRoot: string;

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

function branchDiff(target?: string): string {
  return execFileSync(
    process.execPath,
    [scriptPath, ...(target === undefined ? [] : [target])],
    { cwd: repoRoot, encoding: 'utf8' }
  );
}

beforeAll(() => {
  repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'branch-diff-'));
  git('init', '--initial-branch=main');
  git('config', 'user.name', 'Branch Diff Test');
  git('config', 'user.email', 'branch-diff@example.com');
  fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'base\n');
  git('add', 'example.txt');
  git('commit', '-m', 'Initial commit');
});

afterAll(() => {
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
    expect(branchDiff(path.join(repoRoot, 'example.txt'))).toContain(
      '+current source'
    );
    expect(branchDiff(featureCommit)).toContain('+feature');

    git('restore', 'example.txt');
    git('switch', 'main');
    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'working main\n');
    fs.writeFileSync(path.join(repoRoot, 'untracked.txt'), 'untracked main\n');

    const mainDiff = branchDiff();
    expect(mainDiff).toContain('+working main');
    expect(mainDiff).toContain('+untracked main');
  });
});
