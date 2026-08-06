// Prints a standup summary of recent Git activity.
//
// - Last 10 days of your commits on main and local branches with changes:
//
// `git-standup`
//
// - Custom time range:
//
// `git-standup --days 14`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { callApfel } from '../util/ai.ts';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import {
  assertGitRepo,
  getBaseBranch,
  getBranchChangeLog,
  getBranchesWithChanges,
  getGitAuthor,
  getGitRepoRoot,
  getMainCommits,
} from '../util/git.ts';
import { log, run, theme } from '../util/tui.ts';

const OPTIONS = [
  {
    name: 'days',
    type: 'number',
    default: 10,
    min: 1,
  },
] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

const BRANCH_SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description:
        'One short sentence describing what changed. No preamble, no author or team names.',
    },
  },
  required: ['summary'],
  additionalProperties: false,
} as const;

const BRANCH_SUMMARY_SYSTEM_PROMPT =
  'Summarize git branch changes for a standup. ' +
  'Reply with one short sentence: what changed, in plain English. ' +
  'State facts directly — do not mention commits, authors, teams, or process. ' +
  'Never open with filler such as "Several commits" or "This branch".';

function printCommits(
  commits: readonly { date: string; subject: string }[]
): void {
  if (commits.length === 0) {
    console.log(theme.muted('No commits found'));
    return;
  }

  for (const commit of commits) {
    console.log(`${theme.muted(commit.date)}  ${commit.subject}`);
  }
}

function summarizeBranchChanges(changeLog: string): string {
  const { summary } = callApfel<{ summary: string }>({
    inputContent: changeLog,
    systemPrompt: BRANCH_SUMMARY_SYSTEM_PROMPT,
    schema: BRANCH_SUMMARY_SCHEMA,
    userPrompt: 'Summarize the changes.',
    maxTokens: 80,
  });
  return summary.trim();
}

/** Prints a standup summary of recent Git activity in the current repository. */
export function gitStandup({ days }: Options): void {
  assertGitRepo();

  const repoRoot = getGitRepoRoot();
  const baseBranch = getBaseBranch(repoRoot);
  const author = getGitAuthor();
  const options = { days, author, baseBranch };

  log.heading(`\n${baseBranch} (last ${days} days)\n`);
  printCommits(getMainCommits(repoRoot, options));

  const branches = getBranchesWithChanges(repoRoot, options);

  log.heading(`\nLocal branches with changes (last ${days} days)\n`);
  if (branches.length === 0) {
    console.log(theme.muted('No branches found'));
    return;
  }

  for (const branch of branches) {
    console.log(theme.strong(branch.branch));
    const changeLog = getBranchChangeLog(repoRoot, branch.branch, options);
    if (changeLog === '') {
      console.log(branch.commits.map((commit) => commit.subject).join('; '));
    } else {
      console.log(summarizeBranchChanges(changeLog));
    }
    console.log();
  }
}

await run(import.meta.url, () => gitStandup(parseArgs(OPTIONS)));
