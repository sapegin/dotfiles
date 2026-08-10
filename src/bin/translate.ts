// Local offline translation via translateLocally (de/es ↔ en).
//
// Install app: https://github.com/XapaJIaMnu/translateLocally/releases
// Download models in the app (Edit → Translator Settings → Languages).
//
// - Translate German to English:
//
// `translate de "Meine Versicherung"`
//
// - Translate Spanish from stdin:
//
// `echo "Hola mundo" | translate es`
//
// - Explicit direction:
//
// `translate en de "Hello world"`
//
// - List installed models:
//
// `translate models`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execFileSync, spawnSync } from 'node:child_process';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { showHelp } from '../util/help.ts';
import { run } from '../util/tui.ts';

const BINARY =
  '/Applications/translateLocally.app/Contents/MacOS/translateLocally';

const LANGS = ['de', 'es', 'en'] as const;

const OPTIONS = [{ name: 'args', rest: true }] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

type Lang = (typeof LANGS)[number];

function isLang(value: string | undefined): value is Lang {
  return value !== undefined && (LANGS as readonly string[]).includes(value);
}

export function modelFor(from: Lang, to: Lang): string {
  if (from === to) {
    throw new Error('Source and target language must differ.');
  }

  switch (`${from}-${to}`) {
    case 'de-en':
      return 'de-en-tiny';
    case 'es-en':
      return 'es-en-tiny';
    case 'en-de':
      return 'en-de-tiny';
    case 'en-es':
      return 'en-es-tiny';
    default:
      throw new Error(
        `Unsupported language pair: ${from} → ${to} (supported: de/en, es/en)`
      );
  }
}

export function parseDirection(args: readonly string[]): {
  to: Lang;
  text?: string;
} {
  let rest = [...args];
  let to: Lang = 'en';

  const [maybeTarget, ...remaining] = rest;
  if (isLang(maybeTarget)) {
    to = maybeTarget;
    rest = remaining;
  }

  if (rest.length === 0) {
    return { to };
  }

  return { to, text: rest.join(' ') };
}

function runTranslateLocally(model: string, text?: string): void {
  const result =
    text === undefined
      ? spawnSync(BINARY, ['-m', model], { stdio: 'inherit' })
      : spawnSync(BINARY, ['-m', model], {
          input: text,
          stdio: ['pipe', 'inherit', 'inherit'],
        });

  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`translateLocally exited with status ${result.status ?? 1}`);
  }
}

export function translate({ args }: Options): void {
  if (args.length === 0) {
    showHelp(['translate']);
    return;
  }

  const command = args[0].toLowerCase();

  if (command === 'models') {
    execFileSync(BINARY, ['-l'], { stdio: 'inherit' });
    return;
  }

  if (isLang(command) === false) {
    throw new Error(`Unknown command: ${args[0]}`);
  }

  const from = command;
  const { to, text } = parseDirection(args.slice(1));
  runTranslateLocally(modelFor(from, to), text);
}

await run(import.meta.url, () => translate(parseArgs(OPTIONS)));
