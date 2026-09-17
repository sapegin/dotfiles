/*
 * Parses and searches the text bookmarks file (~cloud/Documents/Bookmarks.md).
 *
 * Used by Tinycast `bookmarks`.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const BOOKMARKS_FILE = path.join(
  os.homedir(),
  'cloud',
  'Documents',
  'Bookmarks.md'
);

export interface Bookmark {
  title: string;
  subtitle: string;
  url: string;
  /** Lowercase text used for filtering. */
  searchText: string;
  /** 1-based line number of the title line in Bookmarks.md (for VS Code). */
  titleLineNumber: number;
}

function formatSection(headings: string[]): string {
  return headings.join(' → ');
}

function getHostName(url: string): string {
  const match = url.match(/https?:\/\/(?:www\.)?([\w.-]+)[/:]/);
  return match?.[1] ?? '';
}

/**
 * Parse bookmark entries from the Markdown source (title line + URL line per
 * entry).
 */
export function parseBookmarks(markdown: string): Bookmark[] {
  const lines = markdown.split('\n');
  const bookmarks: Bookmark[] = [];
  let headings: string[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    if (line.startsWith('#')) {
      const headingMatch = line.match(/(#+) (.*)/);
      if (headingMatch === null) {
        continue;
      }

      const headingMark = headingMatch[1];
      const heading = headingMatch[2];
      const depth = headingMark.length;

      if (depth === 1) {
        continue;
      }

      headings = headings.slice(0, depth - 2);
      headings.push(heading);
    } else if (line.startsWith('http://') || line.startsWith('https://')) {
      const titleLineIndex = lineIndex - 1;
      const url = line.trim();
      const title = lines[titleLineIndex] ?? '';
      const hostname = getHostName(url);
      const subtitle = `${hostname} • ${formatSection(headings)}`;
      const searchText =
        `${title.replace(/[()]/, '')} ${hostname} ${headings.at(-1) ?? ''}`
          .replace(/[().]/, ' ')
          .toLowerCase();

      bookmarks.push({
        title,
        subtitle,
        url,
        searchText,
        titleLineNumber: titleLineIndex + 1,
      });
    }
  }

  return bookmarks;
}

/**
 * Read and parse `BOOKMARKS_FILE`. Returns `[]` when the file is missing or
 * unreadable.
 */
export function loadBookmarks(bookmarksFile = BOOKMARKS_FILE): Bookmark[] {
  try {
    return parseBookmarks(fs.readFileSync(bookmarksFile, 'utf8'));
  } catch {
    return [];
  }
}

function bookmarkMatchesQuery(bookmark: Bookmark, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery === '') {
    return true;
  }

  const tokens = normalizedQuery.split(/\s+/);
  return tokens.every((token) => bookmark.searchText.includes(token));
}

/** Filter an in-memory bookmark list (used by tests and Tinycast). */
export function filterBookmarks(
  query: string,
  bookmarks: Bookmark[]
): Bookmark[] {
  return bookmarks.filter((bookmark) => bookmarkMatchesQuery(bookmark, query));
}
