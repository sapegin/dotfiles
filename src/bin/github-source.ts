// Prepare a clean, revision-pinned checkout in the shared GitHub research cache.
//
// `github-source owner/repo [revision]`

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { doesPathExist } from '../util/files.ts';
import { captureCommand } from '../util/process.ts';
import { run, UserError } from '../util/tui.ts';

const OPTIONS = [
  { name: 'repository', positional: true, required: true },
  { name: 'revision', positional: true, default: 'HEAD' },
] as const;
export type Options = ParsedArgs<typeof OPTIONS>;

/** Refresh a dedicated research checkout without discarding local work. */
export async function githubSource(
  { repository, revision }: Options,
  cache = '/tmp/pi-github-repos'
): Promise<{ directory: string; commit: string }> {
  if (
    /^[a-z\d][a-z\d-]*\/(?!\.{1,2}$)[a-z\d_.][a-z\d_.-]*$/i.test(repository) ===
    false
  ) {
    throw new UserError('Repository must be owner/repo.');
  }
  if (
    revision.trim() === '' ||
    revision.startsWith('-') ||
    /[\0\r\n]/.test(revision)
  ) {
    throw new UserError(
      'Provide a branch, tag, or commit SHA as the revision.'
    );
  }
  const directory = path.join(cache, repository);
  if ((await doesPathExist(directory)) === false) {
    await fs.mkdir(path.dirname(directory), { recursive: true });
    captureCommand(
      'gh',
      ['repo', 'clone', repository, directory, '--', '--depth', '1'],
      { env: { ...process.env, GH_PAGER: 'cat' } }
    );
  }
  const root = captureCommand('git', ['rev-parse', '--show-toplevel'], {
    cwd: directory,
  }).stdout.trim();
  if (root !== (await fs.realpath(directory))) {
    throw new UserError(`Cache path is not a repository root: ${directory}`);
  }
  const status = captureCommand(
    'git',
    ['status', '--porcelain', '--untracked-files=all'],
    { cwd: directory }
  ).stdout;
  if (status !== '') {
    throw new UserError(
      `Research checkout has local changes; preserve them before retrying: ${directory}`
    );
  }
  captureCommand('git', ['fetch', '--depth', '1', 'origin', revision], {
    cwd: directory,
  });
  captureCommand(
    'git',
    ['checkout', '--detach', '--no-overwrite-ignore', 'FETCH_HEAD'],
    { cwd: directory }
  );
  const commit = captureCommand('git', ['rev-parse', 'HEAD'], {
    cwd: directory,
  }).stdout.trim();
  return { directory, commit };
}

await run(import.meta.url, async () => {
  console.log(JSON.stringify(await githubSource(parseArgs(OPTIONS)), null, 2));
});
