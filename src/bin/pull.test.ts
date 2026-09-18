import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const scriptPath = path.join(import.meta.dirname, 'pull.ts');
let repoRoot: string;

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

beforeAll(() => {
  repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pull-cli-'));
  git('init', '--initial-branch=main');
  git('config', 'user.name', 'Pull Test');
  git('config', 'user.email', 'pull@example.com');
  fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'base\n');
  git('add', 'example.txt');
  git('commit', '-m', 'Initial commit');
  git('remote', 'add', 'origin', path.join(repoRoot, 'missing.git'));
});

afterAll(() => {
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

describe('pull CLI', () => {
  test('forwards Git failures without a Node stack trace', () => {
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('fatal:');
    expect(result.stderr).not.toContain('Error: Command failed');
    expect(result.stderr).not.toContain('at pull (');
  });
});
