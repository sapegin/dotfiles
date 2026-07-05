import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  dedupeRawJpegPairs,
  findMediaFiles,
  getDatedPhotoFilename,
  getPhotoFilenameYear,
  isVisiblePhotoFile,
} from './photos.ts';

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

describe(isVisiblePhotoFile, () => {
  test('rejects hidden files', () => {
    expect(isVisiblePhotoFile('/photos/.DS_Store')).toBe(false);
    expect(isVisiblePhotoFile('/photos/._IMG_0001.JPG')).toBe(false);
    expect(isVisiblePhotoFile('/photos/IMG_0001.JPG')).toBe(true);
  });
});

describe(dedupeRawJpegPairs, () => {
  test('prefers RAW files over matching JPEG files', () => {
    expect(
      dedupeRawJpegPairs([
        '/photos/IMG_0002.JPG',
        '/photos/IMG_0001.JPG',
        '/photos/IMG_0001.RAF',
      ])
    ).toStrictEqual(['/photos/IMG_0001.RAF', '/photos/IMG_0002.JPG']);
  });
});

describe(findMediaFiles, () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'photos-test-'));
    await fs.writeFile(path.join(tmpDir, 'IMG_0001.JPG'), '');
    await fs.writeFile(path.join(tmpDir, '.DS_Store'), '');
    await fs.writeFile(path.join(tmpDir, 'clip.MOV'), '');
    await fs.mkdir(path.join(tmpDir, 'nested'));
    await fs.writeFile(path.join(tmpDir, 'nested', 'IMG_0002.RAF'), '');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true });
  });

  test('finds visible media files recursively', async () => {
    await expect(findMediaFiles(tmpDir)).resolves.toStrictEqual([
      path.join(tmpDir, 'clip.MOV'),
      path.join(tmpDir, 'IMG_0001.JPG'),
      path.join(tmpDir, 'nested', 'IMG_0002.RAF'),
    ]);
  });
});
