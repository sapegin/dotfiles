// Send your local branch changes to the remote branch. Any extra arguments to
// this command will be passed through to `git push`, for example for doing `push -f`.
//
// - Push local changes to the remote:
//
// `push`
//
// ---
// Based on git-friendly:
// https://github.com/git-friendly/git-friendly
//
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { spawnSync } from 'node:child_process';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import {
  assertCurrentBranch,
  assertGitRepo,
  getBranchUpstream,
} from '../util/git.ts';
import { log, run } from '../util/tui.ts';

const OPTIONS = [{ name: 'args', rest: true }] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

export function push({ args }: Options): void {
  assertGitRepo();

  const branch = assertCurrentBranch();

  let pushArgs: string[];
  if (args.length === 0) {
    const { remote, remoteBranch } = getBranchUpstream(branch);
    pushArgs = [remote, remoteBranch];
  } else {
    pushArgs = args;
  }

  console.log('↑ Pushing…');
  console.log();

  const result = spawnSync('git', ['push', '--set-upstream', ...pushArgs], {
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  const output = result.stdout + result.stderr;
  const remoteLines = output
    .split('\n')
    .filter((line) => line.startsWith('remote:'));
  for (const line of remoteLines) {
    console.log(line);
  }
  console.log();

  if (result.status !== 0) {
    log.error(
      `Alas! The push has met with unforeseen resistance!\n\n${output}`
    );
    process.exit(result.status ?? 1);
  } else if (output.includes('Everything up-to-date')) {
    console.log('✓ Git says everything is up-to-date!');
  }
}

await run(import.meta.url, () => push(parseArgs(OPTIONS)));
