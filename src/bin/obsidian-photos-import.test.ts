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
import { type ExifMetadata } from '../util/exif.ts';
import { type ImageDimensions } from '../util/obsidian.ts';
import { type Options } from './obsidian-photos-import.ts';

const testEnv = vi.hoisted(() => ({
  root: '',
  desktop: '',
  vault: '',
  attachments: '',
  dailyNotes: '',
}));

const exifByBasename = vi.hoisted(() => new Map<string, ExifMetadata>());
const openObsidianPath = vi.hoisted(() =>
  vi.fn<(relativePath: string) => void>()
);

vi.mock(import('../util/files.ts'), async (importOriginal) => {
  const original = await importOriginal<typeof import('../util/files.ts')>();
  return {
    ...original,
    get dirs() {
      return {
        ...original.dirs,
        desktop: testEnv.desktop,
        obsidianVault: testEnv.vault,
        obsidianDailyNotes: testEnv.dailyNotes,
        obsidianAttachments: testEnv.attachments,
      };
    },
  };
});

vi.mock(import('../util/exif.ts'), () => ({
  readExifMetadata: vi.fn<(sourcePath: string) => Promise<ExifMetadata>>(
    (sourcePath) =>
      Promise.resolve(exifByBasename.get(path.basename(sourcePath)) ?? {})
  ),
}));

vi.mock(import('../util/obsidian.ts'), async (importOriginal) => {
  const original = await importOriginal<typeof import('../util/obsidian.ts')>();
  return {
    ...original,
    openObsidianPath,
    needsOptimization: vi
      .fn<
        (
          imagePath: string,
          onError?: (message: string) => void
        ) => Promise<ImageDimensions | undefined>
      >()
      .mockResolvedValue(undefined),
  };
});

const NOTE_BASENAME = '2026-09-01_1226';
const NOTE_PATH = () =>
  path.join(testEnv.dailyNotes, '2026', `${NOTE_BASENAME}.md`);

function setExif(basename: string, datetime: Date): void {
  const date = [
    datetime.getFullYear(),
    String(datetime.getMonth() + 1).padStart(2, '0'),
    String(datetime.getDate()).padStart(2, '0'),
  ].join('-');

  exifByBasename.set(basename, {
    date,
    year: date.slice(0, 4),
    datetime,
  });
}

async function writeDesktopPhoto(basename: string): Promise<string> {
  const filePath = path.join(testEnv.desktop, basename);
  await fs.writeFile(filePath, 'jpeg');
  return filePath;
}

async function resetNote(
  content = '# Sunday, September 1, 2026\n\nExisting entry\n'
) {
  await fs.mkdir(path.dirname(NOTE_PATH()), { recursive: true });
  await fs.writeFile(NOTE_PATH(), content);
}

async function clearDesktop(): Promise<void> {
  for (const entry of await fs.readdir(testEnv.desktop)) {
    await fs.rm(path.join(testEnv.desktop, entry));
  }
}

async function clearAttachments(): Promise<void> {
  await fs.mkdir(testEnv.attachments, { recursive: true });
  for (const entry of await fs.readdir(testEnv.attachments)) {
    await fs.rm(path.join(testEnv.attachments, entry));
  }
}

let obsidianPhotosImport: typeof import('./obsidian-photos-import.ts').obsidianPhotosImport;

beforeAll(async () => {
  testEnv.root = await fs.mkdtemp(
    path.join(os.tmpdir(), 'obsidian-photos-import-')
  );
  testEnv.desktop = path.join(testEnv.root, 'Desktop');
  testEnv.vault = path.join(testEnv.root, 'murder');
  testEnv.attachments = path.join(testEnv.vault, 'zz-attachments');
  testEnv.dailyNotes = path.join(testEnv.vault, 'Log');

  await fs.mkdir(testEnv.desktop, { recursive: true });
  await fs.mkdir(testEnv.attachments, { recursive: true });

  ({ obsidianPhotosImport } = await import('./obsidian-photos-import.ts'));
});

beforeEach(async () => {
  exifByBasename.clear();
  openObsidianPath.mockClear();
  await clearDesktop();
  await clearAttachments();
  await resetNote();
});

afterAll(async () => {
  await fs.rm(testEnv.root, { recursive: true, force: true });
});

describe('obsidianPhotosImport import', () => {
  test('does not run on import', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    const { obsidianPhotosImport: importedFn } =
      await import('./obsidian-photos-import.ts');

    expect(importedFn).toBeTypeOf('function');
    expect(exit).not.toHaveBeenCalled();
    exit.mockRestore();
  });
});

describe('obsidianPhotosImport single-note mode', () => {
  test('appends imported photos in EXIF order to an existing note', async () => {
    setExif('2026_IMG_0002.jpg', new Date(2026, 8, 1, 12, 26));
    setExif('2026_IMG_0001.jpg', new Date(2026, 8, 1, 10, 0));
    await writeDesktopPhoto('2026_IMG_0002.jpg');
    await writeDesktopPhoto('2026_IMG_0001.jpg');

    await obsidianPhotosImport({ note: NOTE_BASENAME });

    await expect(fs.readFile(NOTE_PATH(), 'utf8')).resolves.toBe(
      '# Sunday, September 1, 2026\n\nExisting entry\n\n' +
        '![[2026_IMG_0001.jpg]]\n\n' +
        '![[2026_IMG_0002.jpg]]\n'
    );
    await expect(
      fs.access(path.join(testEnv.attachments, '2026_IMG_0001.jpg'))
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(testEnv.attachments, '2026_IMG_0002.jpg'))
    ).resolves.toBeUndefined();
    expect(openObsidianPath).toHaveBeenCalledWith(
      path.join('Log', '2026', `${NOTE_BASENAME}.md`)
    );
  });

  test('skips photos whose attachments already exist in the vault', async () => {
    setExif('2026_IMG_0001.jpg', new Date(2026, 8, 1, 10, 0));
    setExif('2026_IMG_0002.jpg', new Date(2026, 8, 1, 12, 26));
    await fs.writeFile(
      path.join(testEnv.attachments, '2026_IMG_0001.jpg'),
      'existing'
    );
    await writeDesktopPhoto('2026_IMG_0001.jpg');
    await writeDesktopPhoto('2026_IMG_0002.jpg');

    await obsidianPhotosImport({ note: NOTE_BASENAME });

    await expect(fs.readFile(NOTE_PATH(), 'utf8')).resolves.toBe(
      '# Sunday, September 1, 2026\n\nExisting entry\n\n![[2026_IMG_0002.jpg]]\n'
    );
    await expect(
      fs.readFile(path.join(testEnv.attachments, '2026_IMG_0001.jpg'), 'utf8')
    ).resolves.toBe('existing');
  });

  test('exits when the note name is invalid', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit:${code}`);
    });

    setExif('2026_IMG_0001.jpg', new Date(2026, 8, 1, 10, 0));
    await writeDesktopPhoto('2026_IMG_0001.jpg');

    await expect(obsidianPhotosImport({ note: 'not-a-note' })).rejects.toThrow(
      'process.exit:1'
    );
    exit.mockRestore();
  });

  test('exits when the note does not exist', async () => {
    await fs.rm(NOTE_PATH());
    const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit:${code}`);
    });

    setExif('2026_IMG_0001.jpg', new Date(2026, 8, 1, 10, 0));
    await writeDesktopPhoto('2026_IMG_0001.jpg');

    await expect(obsidianPhotosImport({ note: NOTE_BASENAME })).rejects.toThrow(
      'process.exit:1'
    );
    exit.mockRestore();
  });
});

describe('obsidianPhotosImport default mode', () => {
  test('appends to an existing daily note instead of skipping import', async () => {
    const earliest = new Date(2026, 8, 1, 10, 0);
    const later = new Date(2026, 8, 1, 12, 26);
    const dailyNotePath = path.join(
      testEnv.dailyNotes,
      '2026',
      '2026-09-01_1000.md'
    );

    await fs.mkdir(path.dirname(dailyNotePath), { recursive: true });
    await fs.writeFile(
      dailyNotePath,
      '# Sunday, September 1, 2026\n\nExisting entry\n'
    );

    setExif('2026_IMG_0002.jpg', later);
    setExif('2026_IMG_0001.jpg', earliest);
    await writeDesktopPhoto('2026_IMG_0002.jpg');
    await writeDesktopPhoto('2026_IMG_0001.jpg');

    const defaultOptions = { note: undefined } satisfies Options;
    await obsidianPhotosImport(defaultOptions);

    await expect(fs.readFile(dailyNotePath, 'utf8')).resolves.toBe(
      '# Sunday, September 1, 2026\n\nExisting entry\n\n' +
        '![[2026_IMG_0001.jpg]]\n\n' +
        '![[2026_IMG_0002.jpg]]\n'
    );
    expect(openObsidianPath).toHaveBeenCalledWith(
      'zz-bases/Untagged logs.base'
    );
  });
});
