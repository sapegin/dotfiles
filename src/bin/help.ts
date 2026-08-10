// Tldr/tlrc wrapper to show docs from `~/dotfiles/docs` or `~/dotfiles/bin`.
// > More information: <https://github.com/tldr-pages/tlrc>
//
// - Show docs:
//
// `help {{command}}`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { showHelp } from '../util/help.ts';
import { run } from '../util/tui.ts';

const OPTIONS = [{ name: 'args', rest: true }] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

export function help({ args }: Options): void {
  showHelp(args);
}

await run(import.meta.url, () => help(parseArgs(OPTIONS)));
