// Publish Obsidian vault content to site monorepos.
//
// `obsidian-publish site`
// `obsidian-publish recipes`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import path from 'node:path';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { dirs } from '../util/files.ts';
import { assertObsidianVault } from '../util/obsidian.ts';
import { publishRecipes } from '../publish/recipes.ts';
import { publishSite } from '../publish/site.ts';
import { run } from '../util/tui.ts';

const SITE_NAMES = ['site', 'recipes'] as const;

const OPTIONS = [
  {
    name: 'site',
    positional: true,
    required: true,
    values: SITE_NAMES,
  },
] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

const REPO_ROOT = path.join(dirs.projects, 'sapegin.me');

export async function obsidianPublish(options: Options): Promise<void> {
  await assertObsidianVault();

  console.log(`Repo: ${REPO_ROOT}\n`);

  switch (options.site) {
    case 'site':
      publishSite(REPO_ROOT);
      return;
    case 'recipes':
      await publishRecipes(REPO_ROOT);
  }
}

await run(import.meta.url, () => obsidianPublish(parseArgs(OPTIONS)));
