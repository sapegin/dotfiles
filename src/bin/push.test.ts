import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const scriptPath = path.join(import.meta.dirname, 'push.ts');
let remoteRoot: string;
let repoRoot: string;
let testRoot: string;

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

beforeAll(() => {
  testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'push-cli-'));
  remoteRoot = path.join(testRoot, 'remote.git');
  repoRoot = path.join(testRoot, 'repo');

  execFileSync('git', ['init', '--bare', remoteRoot]);
  execFileSync('git', ['init', '--initial-branch=main', repoRoot]);
  git('config', 'user.name', 'Push Test');
  git('config', 'user.email', 'push@example.com');
  fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'base\n');
  git('add', 'example.txt');
  git('commit', '-m', 'Initial commit');
  git('remote', 'add', 'origin', remoteRoot);
  git('push', '--quiet', 'origin', 'main');
});

afterAll(() => {
  fs.rmSync(testRoot, { recursive: true, force: true });
});

describe('push CLI', () => {
  test('sets the upstream on the first push without printing a fatal error', () => {
    git('switch', '-c', 'feature', '--no-track');

    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(git('rev-parse', '--abbrev-ref', 'feature@{upstream}')).toBe(
      'origin/feature'
    );
  });
});
