import { execFileSync } from 'node:child_process';

/** Let the user choose one item with fzf; return undefined when cancelled. */
export function select(
  items: readonly string[],
  prompt: string
): string | undefined {
  try {
    return execFileSync(
      'fzf',
      ['--height', '40%', '--reverse', '--prompt', `${prompt} `],
      {
        input: items.join('\n'),
        encoding: 'utf8',
      }
    ).trim();
  } catch {
    return undefined;
  }
}
