import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { githubSource } from './github-source.ts';

let directory: string;
let origin: string;
let cache: string;
function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'github-source-'));
  origin = path.join(directory, 'origin');
  cache = path.join(directory, 'cache');
  fs.mkdirSync(origin);
  git(origin, 'init', '--initial-branch=main');
  git(origin, 'config', 'user.name', 'Source Test');
  git(origin, 'config', 'user.email', 'source@example.com');
  git(origin, 'config', 'commit.gpgsign', 'false');
  git(origin, 'config', 'core.hooksPath', '/dev/null');
  fs.writeFileSync(path.join(origin, 'source.txt'), 'first\n');
  git(origin, 'add', '.');
  git(origin, 'commit', '-m', 'First');
  git(origin, 'tag', '-a', 'v1', '-m', 'Version one');
  fs.writeFileSync(
    path.join(directory, 'gh'),
    `#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
const args = process.argv.slice(2);
if (args[0] !== 'repo' || args[1] !== 'clone') process.exit(99);
execFileSync('git', ['clone', '--depth', '1', process.env.SOURCE_ORIGIN, args[3]], { stdio: 'inherit' });
`,
    { mode: 0o755 }
  );
  vi.stubEnv('PATH', `${directory}:${process.env.PATH}`);
  vi.stubEnv('SOURCE_ORIGIN', `file://${origin}`);
});
afterEach(() => {
  vi.unstubAllEnvs();
  fs.rmSync(directory, { recursive: true, force: true });
});

test('clones once, refreshes cached HEAD, and resolves annotated tags to commits', async () => {
  const first = await githubSource(
    { repository: 'acme/source', revision: 'HEAD' },
    cache
  );
  expect(first.commit).toBe(git(origin, 'rev-parse', 'HEAD'));
  expect(git(first.directory, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe(
    'HEAD'
  );
  fs.writeFileSync(path.join(origin, 'source.txt'), 'second\n');
  git(origin, 'commit', '-am', 'Second');
  const latest = await githubSource(
    { repository: 'acme/source', revision: 'main' },
    cache
  );
  expect(latest.commit).toBe(git(origin, 'rev-parse', 'HEAD'));
  expect(
    fs.readFileSync(path.join(latest.directory, 'source.txt'), 'utf8')
  ).toBe('second\n');
  const tag = await githubSource(
    { repository: 'acme/source', revision: 'v1' },
    cache
  );
  expect(tag.commit).toBe(first.commit);
  expect(tag.commit).not.toBe(git(origin, 'rev-parse', 'v1'));
});

test('preserves tracked and untracked local changes', async () => {
  const result = await githubSource(
    { repository: 'acme/source', revision: 'HEAD' },
    cache
  );
  fs.writeFileSync(path.join(result.directory, 'note.txt'), 'keep');
  await expect(
    githubSource({ repository: 'acme/source', revision: 'v1' }, cache)
  ).rejects.toThrow('local changes');
  fs.rmSync(path.join(result.directory, 'note.txt'));
  fs.writeFileSync(path.join(result.directory, 'source.txt'), 'keep this too');
  await expect(
    githubSource({ repository: 'acme/source', revision: 'v1' }, cache)
  ).rejects.toThrow('local changes');
  expect(git(result.directory, 'rev-parse', 'HEAD')).toBe(result.commit);
  expect(
    fs.readFileSync(path.join(result.directory, 'source.txt'), 'utf8')
  ).toBe('keep this too');
});

test('reports fetch errors without changing the checked-out revision', async () => {
  const result = await githubSource(
    { repository: 'acme/source', revision: 'HEAD' },
    cache
  );
  const script = `import { githubSource } from ${JSON.stringify(path.join(import.meta.dirname, 'github-source.ts'))}; await githubSource({ repository: 'acme/source', revision: 'missing-ref' }, ${JSON.stringify(cache)});`;
  const failure = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', script],
    { encoding: 'utf8' }
  );
  expect(failure.status).not.toBe(0);
  expect(failure.stderr).toContain("couldn't find remote ref");
  expect(git(result.directory, 'rev-parse', 'HEAD')).toBe(result.commit);
});

test('rejects path traversal and option-like revisions before touching the cache', async () => {
  await expect(
    githubSource({ repository: '../source', revision: 'HEAD' }, cache)
  ).rejects.toThrow('owner/repo');
  await expect(
    githubSource({ repository: 'acme/..', revision: 'HEAD' }, cache)
  ).rejects.toThrow('owner/repo');
  await expect(
    githubSource(
      { repository: 'acme/source', revision: '--upload-pack=bad' },
      cache
    )
  ).rejects.toThrow('revision');
  expect(fs.existsSync(cache)).toBe(false);
});
