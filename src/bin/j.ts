// Magic project opener: `cd` to a folder using fuzzy search. Looks at `~/\_/`, work projects, and several iCloud Drive folders. Fuzzy-matched; word-initial abbreviations are preferred.
//
// - Navigate to a project directory:
//
// `j {{partial_name}}`
//
// # Optional environmental variables
//
// - `WORK_PROJECTS_DIR="~/unicorn"`: specify an additional folder to look in.
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { searchProjects } from '../util/projectsSearch.ts';
import { run } from '../util/tui.ts';

const OPTIONS = [
  {
    name: 'query',
    positional: true,
    required: true,
  },
] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

export function j({ query }: Options): void {
  const results = searchProjects(query);

  if (results.length === 0) {
    console.log('Repository not found');
    process.exit(1);
  }

  console.log(results[0]);
  process.exit(0);
}

await run(import.meta.url, () => j(parseArgs(OPTIONS)));
