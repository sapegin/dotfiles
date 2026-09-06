import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { dirs } from './files.ts';
import {
  getDailyNotePath,
  getMarkdownImages,
  getNotePath,
  parseFrontmatter,
  replaceMarkdownImageReferences,
  stripImageWikilinks,
  type VaultFrontmatter,
} from './obsidian.ts';

describe(getMarkdownImages, () => {
  test('returns images from Markdown and Obsidian image syntax', () => {
    expect(
      getMarkdownImages(
        [
          '![Alt](attachments/photo.jpg)',
          '![[2026_IMG_1234.jpeg|400]]',
          '![[Regular note]]',
          '![Doc](file.pdf)',
        ].join('\n')
      )
    ).toStrictEqual(['photo.jpg', '2026_IMG_1234.jpeg']);
  });

  test('decodes Markdown image filenames', () => {
    expect(getMarkdownImages('![Alt](Photos/My%20Photo.JPG)')).toStrictEqual([
      'My Photo.JPG',
    ]);
  });
});

describe(replaceMarkdownImageReferences, () => {
  test('updates Markdown and Obsidian image targets', () => {
    expect(
      replaceMarkdownImageReferences(
        [
          '![photo.jpg](attachments/photo.jpg)',
          '![[photo.jpg|400]]',
          '![[note]]',
        ].join('\n'),
        'photo.jpg',
        'photo.avif'
      )
    ).toBe(
      [
        '![photo.jpg](attachments/photo.avif)',
        '![[photo.avif|400]]',
        '![[note]]',
      ].join('\n')
    );
  });

  test('updates URL-encoded Markdown image targets', () => {
    expect(
      replaceMarkdownImageReferences(
        '![Alt](Photos/My%20Photo.JPG)',
        'My Photo.JPG',
        'My Photo.avif'
      )
    ).toBe('![Alt](Photos/My Photo.avif)');
  });
});

describe(stripImageWikilinks, () => {
  test('removes Obsidian image wikilinks without removing Markdown images', () => {
    expect(
      stripImageWikilinks('Before\n![[photo.jpg|400]]\n![Alt](photo.jpg)')
    ).toBe('Before\n![Alt](photo.jpg)');
  });
});

describe(getNotePath, () => {
  test('resolves daily note path from basename', () => {
    expect(getNotePath('2026-07-05_1021')).toBe(
      path.join(dirs.obsidianDailyNotes, '2026', '2026-07-05_1021.md')
    );
  });
});

describe(getDailyNotePath, () => {
  test('resolves daily note path from a timestamp', () => {
    expect(getDailyNotePath(new Date(2026, 6, 5, 10, 21))).toBe(
      path.join(dirs.obsidianDailyNotes, '2026', '2026-07-05_1021.md')
    );
  });
});

describe(parseFrontmatter, () => {
  test('parses YAML frontmatter and body', () => {
    expect(
      parseFrontmatter<{ tags: string[]; title: string }>(`---
title: Test
tags:
  - daily
---
# Hello`)
    ).toStrictEqual({
      frontmatter: { title: 'Test', tags: ['daily'] },
      body: '# Hello',
      hasFrontmatter: true,
    });
  });

  test('returns empty frontmatter when note has no frontmatter block', () => {
    expect(parseFrontmatter<Record<string, never>>('# Hello')).toStrictEqual({
      frontmatter: {},
      body: '# Hello',
      hasFrontmatter: false,
    });
  });

  test('coerces scalar tags to a string array', () => {
    expect(
      parseFrontmatter<VaultFrontmatter>(`---
tags: daily
---
# Hello`)
    ).toStrictEqual({
      frontmatter: { tags: ['daily'] },
      body: '# Hello',
      hasFrontmatter: true,
    });
  });
});
