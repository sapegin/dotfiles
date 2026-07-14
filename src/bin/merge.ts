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

import { parseArgs } from '../util/args.ts';
import {
  assertGitRepo,
  getCurrentBranch,
  getUpstreamTracking,
  runGit,
} from '../util/git.ts';
import { log } from '../util/tui.ts';

const args = parseArgs([
  {
    name: 'branch',
    positional: true,
    required: true,
  },
]);

assertGitRepo();

const currentBranch = getCurrentBranch();

if (currentBranch === undefined) {
  log.error(
    "✕ You're not on a branch (detached HEAD). Check out a branch first."
  );
  process.exit(1);
}

const remote = 'origin';
const tracking = getUpstreamTracking();

if (tracking?.startsWith(`${remote}/`)) {
  console.log('↑ This branch exists remotely, not rebasing');
} else {
  console.log(
    ` Local-only branch, rebasing ${args.branch} onto ${currentBranch} first…`
  );
  runGit(['switch', args.branch]);
  runGit(['rebase', currentBranch]);
}

console.log(` Merge ${args.branch} into ${currentBranch}`);
runGit(['switch', currentBranch]);
runGit(['merge', args.branch]);
