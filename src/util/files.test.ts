import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  exts,
  expandPath,
  getCommonFolder,
  getExtensionsBrace,
  parseGlobArgs,
  glob,
  hasExtension,
  stripExtensions,
} from './files.ts';

describe(hasExtension, () => {
  test('matches regardless of case', () => {
    expect(hasExtension('IMG_1234.JPG', exts.jpeg)).toBe(true);
    expect(hasExtension('photo.jpeg', exts.jpeg)).toBe(true);
    expect(hasExtension('photo.AVIF', exts.image)).toBe(true);
    expect(hasExtension('clip.MOV', exts.video)).toBe(true);
  });

  test('rejects unknown extensions', () => {
    expect(hasExtension('note.md', exts.image)).toBe(false);
    expect(hasExtension('archive.zip', exts.raw)).toBe(false);
  });
});

describe(stripExtensions, () => {
  test('strips a single known extension case-insensitively', () => {
    expect(stripExtensions('IMG.JPG')).toBe('IMG');
    expect(stripExtensions('photo.avif')).toBe('photo');
  });

  test('leaves unknown extensions intact', () => {
    expect(stripExtensions('archive.zip')).toBe('archive.zip');
  });

  test('strips stacked known extensions', () => {
    expect(stripExtensions('photo.jpg.avif')).toBe('photo');
    expect(stripExtensions('note.md.avif')).toBe('note');
  });
});

describe(getExtensionsBrace, () => {
  test('expands to both lower- and uppercase without duplicates', () => {
    expect(getExtensionsBrace(exts.jpeg)).toBe('{jpg,JPG,jpeg,JPEG}');
  });
});

describe(expandPath, () => {
  test('expands $DOTFILES_DIR and $THEMES_DIR', () => {
    expect(expandPath('$DOTFILES_DIR/tilde/.zshrc')).toBe(
      path.join(
        process.env.DOTFILES_DIR ??
          path.resolve(import.meta.dirname, '..', '..'),
        'tilde/.zshrc'
      )
    );
    expect(expandPath('$THEMES_DIR/Git/themes.gitconfig')).toBe(
      path.join(
        process.env.THEMES_DIR ??
          path.join(os.homedir(), '_', 'squirrelsong', 'themes'),
        'Git/themes.gitconfig'
      )
    );
  });

  test('still expands ~/', () => {
    expect(expandPath('~/murder')).toBe(path.join(os.homedir(), 'murder'));
  });
});

describe(getCommonFolder, () => {
  test('returns the nearest common parent folder', () => {
    expect(
      getCommonFolder([
        '/Volumes/Card/DCIM/100/file1.RAF',
        '/Volumes/Card/DCIM/101/file2.JPG',
      ])
    ).toBe('/Volumes/Card/DCIM');
  });
});

describe(parseGlobArgs, () => {
  test('joins path parts, file name, and extension brace', () => {
    expect(parseGlobArgs(['foo/bar', '**', '*', exts.jpeg]).pattern).toBe(
      `foo/bar/**/*.${getExtensionsBrace(exts.jpeg)}`
    );
  });

  test('accepts a custom extension list', () => {
    expect(parseGlobArgs(['**', '*', ['.pdf']]).pattern).toBe(
      `**/*.${getExtensionsBrace(['.pdf'])}`
    );
  });

  test('joins a directory and file name', () => {
    expect(parseGlobArgs(['vault', '*', exts.markdown]).pattern).toBe(
      `vault/*.${getExtensionsBrace(exts.markdown)}`
    );
  });

  test('treats a lone pattern as the file name when cwd is set', () => {
    expect(parseGlobArgs(['*', exts.markdown, { cwd: '/tmp' }]).pattern).toBe(
      `*.${getExtensionsBrace(exts.markdown)}`
    );
  });
});

describe(glob, () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'files-glob-'));
    await fs.writeFile(path.join(tmpDir, 'a.md'), '');
    await fs.writeFile(path.join(tmpDir, 'b.MD'), '');
    await fs.writeFile(path.join(tmpDir, 'c.txt'), '');
    await fs.mkdir(path.join(tmpDir, 'sub'));
    await fs.writeFile(path.join(tmpDir, 'sub', 'd.md'), '');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true });
  });

  test('finds files by extension in cwd', async () => {
    const files = await glob('*', exts.markdown, { cwd: tmpDir });
    expect(files.toSorted((a, b) => a.localeCompare(b))).toStrictEqual([
      'a.md',
      'b.MD',
    ]);
  });

  test('finds files recursively', async () => {
    const files = await glob('**', '*', exts.markdown, { cwd: tmpDir });
    expect(files.toSorted((a, b) => a.localeCompare(b))).toStrictEqual([
      'a.md',
      'b.MD',
      path.join('sub', 'd.md'),
    ]);
  });
});
