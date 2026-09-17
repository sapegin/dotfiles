import { describe, expect, test } from 'vitest';
import { filterBookmarks, parseBookmarks } from './bookmarks.ts';

const SAMPLE = `# Bookmarks

## Work

My site
https://example.com/docs

Other
https://other.org/page
`;

describe(parseBookmarks, () => {
  test('extracts title, url, and section subtitle', () => {
    const [first] = parseBookmarks(SAMPLE);
    expect(first).toBeDefined();
    expect(first.title).toBe('My site');
    expect(first.url).toBe('https://example.com/docs');
    expect(first.subtitle).toContain('example.com');
    expect(first.subtitle).toContain('Work');
  });
});

describe(filterBookmarks, () => {
  test('matches hostname and title tokens', () => {
    const bookmarks = parseBookmarks(SAMPLE);
    expect(filterBookmarks('other', bookmarks)).toStrictEqual([
      expect.objectContaining({ url: 'https://other.org/page' }),
    ]);
  });

  test('returns all bookmarks when query is empty', () => {
    const bookmarks = parseBookmarks(SAMPLE);
    expect(filterBookmarks('', bookmarks)).toHaveLength(2);
  });
});
