import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const scriptPath = path.join(import.meta.dirname, 'br.ts');
let binRoot: string;
let remoteRoot: string;
let repoRoot: string;
let testRoot: string;

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

beforeAll(() => {
  testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'br-cli-'));
  binRoot = path.join(testRoot, 'bin');
  remoteRoot = path.join(testRoot, 'remote.git');
  repoRoot = path.join(testRoot, 'repo');

  fs.mkdirSync(binRoot);
  execFileSync('git', ['init', '--bare', remoteRoot]);
  execFileSync('git', ['init', '--initial-branch=main', repoRoot]);
  git('config', 'user.name', 'Branch Test');
  git('config', 'user.email', 'branch@example.com');
  fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'base\n');
  git('add', 'example.txt');
  git('commit', '-m', 'Initial commit');
  git('remote', 'add', 'origin', remoteRoot);
  git('push', '--quiet', '--set-upstream', 'origin', 'main');
  git('switch', '-c', 'feature');
  git('push', '--quiet', '--set-upstream', 'origin', 'feature');
  git('switch', 'main');

  const pullPath = path.join(binRoot, 'pull');
  fs.writeFileSync(
    pullPath,
    '#!/bin/sh\necho "Remote is unavailable" >&2\nexit 1\n'
  );
  fs.chmodSync(pullPath, 0o755);
});

afterAll(() => {
  fs.rmSync(testRoot, { recursive: true, force: true });
});

describe('br CLI', () => {
  test('checks out a remote branch that was never fetched locally', () => {
    git('switch', 'main');
    git('branch', '-D', 'feature');
    git('update-ref', '-d', 'refs/remotes/origin/feature');
    expect(git('branch', '--list', 'feature')).toBe('');

    const result = spawnSync(process.execPath, [scriptPath, 'feature'], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binRoot}:${process.env.PATH}`,
      },
    });

    expect(result.status).toBe(0);
    expect(git('branch', '--show-current')).toBe('feature');
    expect(git('rev-parse', 'HEAD')).toBe(
      git('rev-parse', 'origin/feature')
    );
    expect(result.stdout).toContain('Fetching remote branch feature');
  });

  test('keeps a local branch usable when its remote cannot be updated', () => {
    const result = spawnSync(process.execPath, [scriptPath, 'feature'], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binRoot}:${process.env.PATH}`,
      },
    });

    expect(result.status).toBe(0);
    expect(git('branch', '--show-current')).toBe('feature');
    expect(result.stderr).toContain('Remote is unavailable');
    expect(result.stderr).toContain(
      'Could not update from origin; continuing with local branch feature.'
    );
    expect(result.stderr).not.toContain('Error: Command failed');
  });
});
