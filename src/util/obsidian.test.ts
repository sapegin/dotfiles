import { describe, expect, test } from 'vitest';
import {
  getMarkdownImages,
  replaceMarkdownImageReferences,
  stripImageWikilinks,
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
      ['![photo.jpg](attachments/photo.avif)', '![[photo.avif|400]]', '![[note]]'].join(
        '\n'
      )
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
    expect(stripImageWikilinks('Before\n![[photo.jpg|400]]\n![Alt](photo.jpg)')).toBe(
      'Before\n![Alt](photo.jpg)'
    );
  });
});
