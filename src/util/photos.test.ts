import { describe, expect, test } from 'vitest';
import { getPhotoFilenameYear, getDatedPhotoFilename } from './photos.ts';

describe(getPhotoFilenameYear, () => {
  test('reads year from iPhone attachment names', () => {
    expect(getPhotoFilenameYear('2026_IMG_9488.jpeg')).toBe('2026');
  });

  test('reads year from full imported attachment names', () => {
    expect(getPhotoFilenameYear('2026-02-22_7859_Artem_Sapegin.jpg')).toBe(
      '2026'
    );
  });

  test('ignores names without an attachment year prefix', () => {
    expect(getPhotoFilenameYear('IMG_9488.jpeg')).toBeUndefined();
  });
});

describe(getDatedPhotoFilename, () => {
  test('adds year prefix to iPhone names', () => {
    expect(getDatedPhotoFilename('IMG_9488.jpeg', '2026', '2026-02-22')).toBe(
      '2026_IMG_9488.jpeg'
    );
  });

  test('adds year prefix when only a year is available', () => {
    expect(getDatedPhotoFilename('IMG_9488.jpeg', '2026')).toBe(
      '2026_IMG_9488.jpeg'
    );
  });

  test('leaves already prefixed names unchanged', () => {
    expect(
      getDatedPhotoFilename('2026_IMG_9488.jpeg', '2026', '2026-02-22')
    ).toBe('2026_IMG_9488.jpeg');
    expect(
      getDatedPhotoFilename(
        '2026-02-22_1234_Artem_Sapegin.jpg',
        '2026',
        '2026-02-22'
      )
    ).toBe('2026-02-22_1234_Artem_Sapegin.jpg');
  });

  test('uses suffix extraction for camera names', () => {
    expect(getDatedPhotoFilename('_MG_1234.JPG', '2026', '2026-02-22')).toBe(
      '2026-02-22_1234_Artem_Sapegin.jpg'
    );
  });
});
