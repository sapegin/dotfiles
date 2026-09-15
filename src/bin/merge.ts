// Tries to merge a local branch into the current branch. It will stop you if you
// are behind and need to pull first.
//
// - Merge a given branch into the current one:
//
// `merge {{branch}}`
//
// ---
// Based on git-friendly:
// https://github.com/git-friendly/git-friendly
//
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { parseArgs, type ParsedArgs } from '../util/args.ts';
import {
  assertCurrentBranch,
  assertGitRepo,
  getUpstreamTracking,
  runGit,
} from '../util/git.ts';
import { run } from '../util/tui.ts';

const OPTIONS = [
  {
    name: 'branch',
    positional: true,
    required: true,
  },
] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

export function merge({ branch }: Options): void {
  assertGitRepo();

  const currentBranch = assertCurrentBranch();

  const remote = 'origin';
  const tracking = getUpstreamTracking();

  if (tracking?.startsWith(`${remote}/`)) {
    console.log('↑ This branch exists remotely, not rebasing');
  } else {
    console.log(
      ` Local-only branch, rebasing ${branch} onto ${currentBranch} first…`
    );
    runGit(['switch', branch]);
    runGit(['rebase', '--autostash', currentBranch]);
  }

  console.log(` Merge ${branch} into ${currentBranch}`);
  runGit(['switch', currentBranch]);
  runGit(['merge', '--autostash', branch]);
}

await run(import.meta.url, () => merge(parseArgs(OPTIONS)));
