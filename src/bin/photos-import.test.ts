import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest';

const testEnv = vi.hoisted(() => ({
  root: '',
  desktop: '',
}));

vi.mock(import('../util/files.ts'), async (importOriginal) => {
  const original = await importOriginal<typeof import('../util/files.ts')>();
  return {
    ...original,
    get dirs() {
      return {
        ...original.dirs,
        desktop: testEnv.desktop,
      };
    },
  };
});

let resolveImportSource: typeof import('./photos-import.ts').resolveImportSource;

beforeAll(async () => {
  testEnv.root = await fs.mkdtemp(path.join(os.tmpdir(), 'photos-import-'));
  testEnv.desktop = path.join(testEnv.root, 'Desktop');
  await fs.mkdir(testEnv.desktop, { recursive: true });

  ({ resolveImportSource } = await import('./photos-import.ts'));
});

beforeEach(async () => {
  for (const entry of await fs.readdir(testEnv.desktop)) {
    await fs.rm(path.join(testEnv.desktop, entry), {
      recursive: true,
      force: true,
    });
  }
});

afterAll(async () => {
  await fs.rm(testEnv.root, { recursive: true, force: true });
});

describe('photosImport import', () => {
  test('does not run on import', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    const { photosImport } = await import('./photos-import.ts');

    expect(photosImport).toBeTypeOf('function');
    expect(exit).not.toHaveBeenCalled();
    exit.mockRestore();
  });
});

describe('resolveImportSource', () => {
  test('returns importable Desktop RAW files when present', async () => {
    const rawPath = path.join(testEnv.desktop, '_MG_1234.DNG');
    await fs.writeFile(rawPath, 'dng');
    await fs.writeFile(path.join(testEnv.desktop, 'notes.txt'), 'ignore');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(resolveImportSource()).resolves.toStrictEqual({
      photos: [rawPath],
    });

    expect(logSpy).toHaveBeenCalledWith('Found 1 photos on Desktop.');
    logSpy.mockRestore();
  });

  test('imports Desktop HEIC/JPEG when no RAW pair exists', async () => {
    const heicPath = path.join(testEnv.desktop, 'IMG_1234.HEIC');
    const jpegPath = path.join(testEnv.desktop, 'IMG_5678.JPG');
    await fs.writeFile(heicPath, 'heic');
    await fs.writeFile(jpegPath, 'jpg');
    await fs.writeFile(path.join(testEnv.desktop, 'shot.png'), 'png');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(resolveImportSource()).resolves.toStrictEqual({
      photos: [heicPath, jpegPath],
    });

    expect(logSpy).toHaveBeenCalledWith('Found 2 photos on Desktop.');
    logSpy.mockRestore();
  });

  test('prefers Desktop RAW over matching JPEG/HEIC pairs', async () => {
    const rawPath = path.join(testEnv.desktop, 'IMG_1234.DNG');
    await fs.writeFile(rawPath, 'dng');
    await fs.writeFile(path.join(testEnv.desktop, 'IMG_1234.HEIC'), 'heic');
    await fs.writeFile(path.join(testEnv.desktop, 'IMG_1234.JPG'), 'jpg');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(resolveImportSource()).resolves.toStrictEqual({
      photos: [rawPath],
    });

    expect(logSpy).toHaveBeenCalledWith('Found 1 photos on Desktop.');
    logSpy.mockRestore();
  });

  test('falls through to card when Desktop photos are not importable', async () => {
    await fs.writeFile(path.join(testEnv.desktop, 'scan.dng'), 'dng');

    const { log } = await import('../util/tui.ts');
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(resolveImportSource()).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      'Desktop photos found but none are importable.'
    );
    expect(logSpy).toHaveBeenCalledWith('Looking for card…');
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });
});
