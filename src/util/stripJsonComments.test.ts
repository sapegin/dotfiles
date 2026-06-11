import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { stripJsonComments } from './stripJsonComments.ts';

const repoRoot = path.resolve(import.meta.dirname, '../..');

describe(stripJsonComments, () => {
  test('replaces line comments with spaces while preserving layout', () => {
    const input = `{
  // leading comment
  "a": 1 // trailing comment
}`;
    const output = stripJsonComments(input);

    expect(output).toBe(`{
                    
  "a": 1                    
}`);
    expect(output).toHaveLength(input.length);
    expect(JSON.parse(output)).toStrictEqual({ a: 1 });
  });

  test('replaces block comments with spaces while preserving layout', () => {
    const input = `{
  /* block */
  "a": 1
}`;
    const output = stripJsonComments(input);

    expect(output).toBe(`{
             
  "a": 1
}`);
    expect(output).toHaveLength(input.length);
    expect(JSON.parse(output)).toStrictEqual({ a: 1 });
  });

  test('preserves newlines inside block comments', () => {
    const input = `{
  /*
   * multiline
   */
  "a": 1
}`;
    const output = stripJsonComments(input);

    expect(output).toBe(`{
    
              
     
  "a": 1
}`);
    expect(output).toHaveLength(input.length);
    expect(JSON.parse(output)).toStrictEqual({ a: 1 });
  });

  test('preserves /* inside strings', () => {
    const input = `{
  "source": "~/dotfiles/ai-rules/skills/*",
  "destination": "~/.codex/skills"
}`;
    const output = stripJsonComments(input);

    expect(output).toBe(input);
    expect(JSON.parse(output)).toStrictEqual({
      source: '~/dotfiles/ai-rules/skills/*',
      destination: '~/.codex/skills',
    });
  });

  test('preserves // inside strings', () => {
    const input = `{
  "url": "https://example.com"
}`;
    const output = stripJsonComments(input);

    expect(output).toBe(input);
    expect(JSON.parse(output)).toStrictEqual({
      url: 'https://example.com',
    });
  });

  test('does not treat /* in strings as start of block comments', () => {
    const input = `{
  "source": "~/dotfiles/ai-rules/skills/*",
  "destination": "~/.agents/skills/"
},
/**
 * Obsidian
 */
{
  "source": "~/murder"
}`;
    const output = stripJsonComments(input);

    expect(output).toHaveLength(input.length);
    expect(JSON.parse(`[${output}]`)).toStrictEqual([
      {
        source: '~/dotfiles/ai-rules/skills/*',
        destination: '~/.agents/skills/',
      },
      {
        source: '~/murder',
      },
    ]);
  });

  test('parses dotfiles.json after stripping comments', () => {
    const raw = fs.readFileSync(path.join(repoRoot, 'dotfiles.json'), 'utf8');
    const output = stripJsonComments(raw);
    const parsed = JSON.parse(output);

    expect(output).toHaveLength(raw.length);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
  });
});
