import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { assertGitRepo, configureCommitDraft } from '../util/git.ts';
import { run } from '../util/tui.ts';

const OPTIONS = [] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

/** Configures local Git defaults without replacing existing preferences. */
export function gitConfigure(_options: Options): void {
  assertGitRepo();
  configureCommitDraft();
}

await run(import.meta.url, () => gitConfigure(parseArgs(OPTIONS)));
