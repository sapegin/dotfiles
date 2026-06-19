import { describe, expect, test } from 'vitest';
import { getLineDiffStats } from './pretty.ts';

describe(getLineDiffStats, () => {
  test('reports no changes for identical content', () => {
    expect(getLineDiffStats('a\nb\nc', 'a\nb\nc')).toStrictEqual({
      added: 0,
      removed: 0,
    });
  });

  test('counts a single-line replacement', () => {
    expect(getLineDiffStats('foo', 'bar')).toStrictEqual({
      added: 1,
      removed: 1,
    });
  });

  test('counts a middle-line replacement in a multiline snippet', () => {
    expect(getLineDiffStats('a\nb\nc', 'a\nB\nc')).toStrictEqual({
      added: 1,
      removed: 1,
    });
  });

  test('counts an insertion between existing lines', () => {
    expect(getLineDiffStats('a\nb', 'a\nx\nb')).toStrictEqual({
      added: 1,
      removed: 0,
    });
  });

  test('counts a deletion between existing lines', () => {
    expect(getLineDiffStats('a\nx\nb', 'a\nb')).toStrictEqual({
      added: 0,
      removed: 1,
    });
  });

  test('counts additions from empty content', () => {
    expect(getLineDiffStats('', 'hello')).toStrictEqual({
      added: 1,
      removed: 0,
    });
  });

  test('counts removals to empty content', () => {
    expect(getLineDiffStats('hello', '')).toStrictEqual({
      added: 0,
      removed: 1,
    });
  });

  test('treats both empty strings as unchanged', () => {
    expect(getLineDiffStats('', '')).toStrictEqual({
      added: 0,
      removed: 0,
    });
  });

  test('handles trailing newlines like diffLines', () => {
    expect(getLineDiffStats('foo\n', 'foo\n')).toStrictEqual({
      added: 0,
      removed: 0,
    });
    expect(getLineDiffStats('foo', 'foo\n')).toStrictEqual({
      added: 1,
      removed: 1,
    });
    expect(getLineDiffStats('foo\n', 'foo')).toStrictEqual({
      added: 1,
      removed: 1,
    });
  });

  test('treats CRLF and LF line tokens as different lines', () => {
    expect(getLineDiffStats('a\r\nb', 'a\nb')).toStrictEqual({
      added: 1,
      removed: 1,
    });
  });

  test('aggregates multiple edits the way the pretty extension does', () => {
    const edits = [
      { oldText: 'alpha', newText: 'beta' },
      { oldText: 'one\ntwo', newText: 'one\nx\ntwo' },
    ];
    const totals = edits
      .map((edit) => getLineDiffStats(edit.oldText, edit.newText))
      .reduce(
        (summary, stats) => ({
          added: summary.added + stats.added,
          removed: summary.removed + stats.removed,
        }),
        { added: 0, removed: 0 }
      );

    expect(totals).toStrictEqual({ added: 2, removed: 1 });
  });
});
