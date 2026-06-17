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

import { parseArgs } from '../util/parseArgs.ts';
import { searchProjects } from '../util/projectsSearch.ts';

const args = parseArgs([
  {
    name: 'query',
    positional: true,
    required: true,
  },
]);

const results = searchProjects(args.query);

if (results.length === 0) {
  console.log('Repository not found');
  process.exit(1);
}

console.log(results[0]);
process.exit(0);
