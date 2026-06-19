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
import { assertGitRepo, getCurrentBranch, getGitConfig } from '../util/git.ts';
import { log } from '../util/theme.ts';

assertGitRepo();

const branch = getCurrentBranch();

// TODO: This can also go to git.ts -- used three times
if (branch === undefined) {
  log.error(
    "❌ You're not on a branch (detached HEAD). Check out a branch first."
  );
  process.exit(1);
}

let pushArgs: string[];
const extraArgs = process.argv.slice(2);

if (extraArgs.length === 0) {
  const remote = getGitConfig(`branch.${branch}.remote`) ?? 'origin';
  const mergeRef =
    getGitConfig(`branch.${branch}.merge`) ?? `refs/heads/${branch}`;
  const remoteBranch = mergeRef.split('/').slice(2).join('/');
  pushArgs = [remote, remoteBranch];
} else {
  pushArgs = extraArgs;
}

console.log('🚀 Pushing…');
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
  log.error(`Alas! The push has met with unforeseen resistance!\n\n${output}`);
  process.exit(result.status ?? 1);
} else if (output.includes('Everything up-to-date')) {
  console.log('✌️ Git says everything is up-to-date!');
}
