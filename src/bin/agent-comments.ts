// Collects code comments addressed to an AI agent in a codebase.
//
// Scans all non-binary files (respecting .gitignore) for comments that start
// with `AI:` in any common comment style (`//`, `#`, `/* */`, `<!-- -->`, …)
// and prints each one with its file and line number:
//
//   some/folder/file.ts:34
//   Rename to someOtherFunction()
//
// - Scan the current directory:
//
// `ai-comments`
//
// - Scan a specific directory:
//
// `ai-comments path/to/project`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseArgs } from '../util/args.ts';
import { run } from '../util/tui.ts';

const execFileAsync = promisify(execFile);

// Comment leaders for the common languages: `//`, `#`, `/*`, `/**`, `*`
// (block continuation), `<!--`, `--` (SQL/Lua/Haskell), `;` (Lisp/ini),
// `%` (LaTeX/Erlang), and `'` (VB/VBA).
const COMMENT_LEADER = String.raw`^\s*(?:#+|//+|/\*+|<!--+|--+|;+|%+|\*+|'+)`;

// Pattern handed to ripgrep to find candidate lines.
const SEARCH_PATTERN = `${COMMENT_LEADER}\\s*AI:`;

// Capture the message and optional block/HTML comment terminators on the same line.
const EXTRACT_PATTERN = new RegExp(
  `${COMMENT_LEADER}\\s*AI:[ \\t]?(.+?)(?:\\s*(?:\\*/|-->))?\\s*$`
);

interface RipgrepMatch {
  readonly type: string;
  readonly data: {
    readonly path: { readonly text: string };
    readonly line_number: number;
    readonly lines: { readonly text: string };
  };
}

interface Comment {
  readonly file: string;
  readonly line: number;
  readonly message: string;
}

function extractMessage(lineText: string): string | undefined {
  const match = lineText.match(EXTRACT_PATTERN);
  if (match === null) {
    return undefined;
  }
  return match[1].trim();
}

async function runRipgrep(directory: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      'rg',
      ['--json', '--no-messages', SEARCH_PATTERN, directory],
      {
        encoding: 'utf8',
        // Ignore the user's ~/.ripgreprc, which changes output formatting.
        env: { ...process.env, RIPGREP_CONFIG_PATH: '' },
        maxBuffer: 64 * 1024 * 1024,
      }
    );
    return stdout;
  } catch (error) {
    // ripgrep exits with 1 when there are no matches, 2 on actual errors.
    const execError = error as { code?: unknown };
    if (execError.code === 1) {
      return '';
    }
    throw error;
  }
}

async function collectComments(directory: string): Promise<Comment[]> {
  const stdout = await runRipgrep(directory);

  const comments: Comment[] = [];
  for (const rawLine of stdout.split('\n')) {
    if (rawLine === '') {
      continue;
    }

    const event = JSON.parse(rawLine) as RipgrepMatch;
    if (event.type !== 'match') {
      continue;
    }

    const message = extractMessage(event.data.lines.text);
    if (message === undefined) {
      continue;
    }

    comments.push({
      file: event.data.path.text,
      line: event.data.line_number,
      message,
    });
  }

  return comments;
}

const args = parseArgs([
  {
    name: 'path',
    positional: true,
    default: '.',
  },
]);

async function main() {
  const comments = await collectComments(args.path);

  if (comments.length === 0) {
    return;
  }

  console.log(
    comments
      .map((comment) => `${comment.file}:${comment.line}\n${comment.message}`)
      .join('\n\n')
  );
}

await run(main);
