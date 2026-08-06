import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

const scriptPath = path.join(import.meta.dirname, 'git-standup.ts');
let repoRoot: string;

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

function runGitStandup(...args: string[]): string {
  return execFileSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

beforeAll(() => {
  repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'git-standup-cli-'));
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

describe('git-standup import', () => {
  test('does not run on import', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    const { gitStandup } = await import('./git-standup.ts');

    expect(gitStandup).toBeTypeOf('function');
    expect(exit).not.toHaveBeenCalled();
    exit.mockRestore();
  });
});

describe('git-standup CLI', () => {
  test('prints recent main commits without calling apfel', () => {
    fs.writeFileSync(path.join(repoRoot, 'example.txt'), 'main change\n');
    git('commit', '-am', 'Main change');

    const output = runGitStandup('--days', '30');
    expect(output).toContain('main (last 30 days)');
    expect(output).toContain('Main change');
    expect(output).toContain('Local branches with changes (last 30 days)');
    expect(output).toContain('No branches found');
  });
});

describe('gitStandup', () => {
  test('prints main commits from a typed options object', async () => {
    const { gitStandup } = await import('./git-standup.ts');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const previousCwd = process.cwd();
    process.chdir(repoRoot);

    try {
      gitStandup({ days: 30 });

      const output = logSpy.mock.calls.flat().join('\n');
      expect(output).toContain('main (last 30 days)');
      expect(output).toContain('Main change');
    } finally {
      process.chdir(previousCwd);
      logSpy.mockRestore();
    }
  });
});
