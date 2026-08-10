import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  confirmOverwriteFile,
  exts,
  expandPath,
  getCommonFolder,
  getExtensionsBrace,
  getStem,
  glob,
  hasExtension,
  moveFilePair,
  parseGlobArgs,
  stripExtensions,
  toFilename,
} from './files.ts';
import * as tui from './tui.ts';

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

describe(getStem, () => {
  test('returns basename without extension', () => {
    expect(getStem('/Inbox/scan.pdf')).toBe('scan');
    expect(getStem('Contract 2024.pdf')).toBe('Contract 2024');
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

describe(moveFilePair, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('moves the primary file and renames the sidecar to match', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'files-move-pair-'));
    const inboxDir = path.join(root, 'Inbox');
    const documentsDir = path.join(root, 'Documents', 'Work');
    await fs.mkdir(inboxDir, { recursive: true });
    await fs.mkdir(documentsDir, { recursive: true });

    const sourcePath = path.join(inboxDir, 'scan.pdf');
    const sidecarSource = path.join(inboxDir, 'scan.md');
    const destinationPath = path.join(documentsDir, 'Contract 2024.pdf');
    const sidecarDestination = path.join(documentsDir, 'Contract 2024.md');

    await fs.writeFile(sourcePath, 'pdf');
    await fs.writeFile(sidecarSource, '# OCR text');

    await moveFilePair(sourcePath, destinationPath, '.md');

    await expect(fs.readFile(destinationPath, 'utf8')).resolves.toBe('pdf');
    await expect(fs.readFile(sidecarDestination, 'utf8')).resolves.toBe(
      '# OCR text'
    );
    await expect(fs.access(sourcePath)).rejects.toThrow(/ENOENT/);
    await expect(fs.access(sidecarSource)).rejects.toThrow(/ENOENT/);
  });

  test('skips the sidecar when its destination already exists', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'files-move-block-'));
    const inboxDir = path.join(root, 'Inbox');
    const documentsDir = path.join(root, 'Documents', 'Work');
    await fs.mkdir(inboxDir, { recursive: true });
    await fs.mkdir(documentsDir, { recursive: true });

    const sourcePath = path.join(inboxDir, 'scan.pdf');
    const sidecarSource = path.join(inboxDir, 'scan.md');
    const destinationPath = path.join(documentsDir, 'Contract 2024.pdf');
    const sidecarDestination = path.join(documentsDir, 'Contract 2024.md');

    await fs.writeFile(sourcePath, 'pdf');
    await fs.writeFile(sidecarSource, '# OCR text');
    await fs.writeFile(sidecarDestination, '# old sidecar');
    vi.spyOn(tui, 'confirm').mockResolvedValue(false);

    await expect(
      moveFilePair(sourcePath, destinationPath, '.md')
    ).resolves.toBe('skipped');
    await expect(fs.readFile(destinationPath, 'utf8')).resolves.toBe('pdf');
    await expect(fs.readFile(sidecarSource, 'utf8')).resolves.toBe(
      '# OCR text'
    );
  });

  test('prompts for each destination that already exists', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'files-move-both-'));
    const inboxDir = path.join(root, 'Inbox');
    const documentsDir = path.join(root, 'Documents', 'Work');
    await fs.mkdir(inboxDir, { recursive: true });
    await fs.mkdir(documentsDir, { recursive: true });

    const sourcePath = path.join(inboxDir, 'scan.pdf');
    const sidecarSource = path.join(inboxDir, 'scan.md');
    const destinationPath = path.join(documentsDir, 'Contract 2024.pdf');
    const sidecarDestination = path.join(documentsDir, 'Contract 2024.md');

    await fs.writeFile(sourcePath, 'pdf');
    await fs.writeFile(sidecarSource, '# new sidecar');
    await fs.writeFile(destinationPath, 'old pdf');
    await fs.writeFile(sidecarDestination, '# old sidecar');
    const confirm = vi.spyOn(tui, 'confirm').mockResolvedValue(true);

    await expect(
      moveFilePair(sourcePath, destinationPath, '.md')
    ).resolves.toBe('moved');
    expect(confirm).toHaveBeenCalledTimes(2);
    await expect(fs.readFile(destinationPath, 'utf8')).resolves.toBe('pdf');
    await expect(fs.readFile(sidecarDestination, 'utf8')).resolves.toBe(
      '# new sidecar'
    );
  });

  test('returns failed when the sidecar move fails', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'files-move-fail-'));
    const inboxDir = path.join(root, 'Inbox');
    const documentsDir = path.join(root, 'Documents', 'Work');
    await fs.mkdir(inboxDir, { recursive: true });
    await fs.mkdir(documentsDir, { recursive: true });

    const sourcePath = path.join(inboxDir, 'scan.pdf');
    const sidecarSource = path.join(inboxDir, 'scan.md');
    const destinationPath = path.join(documentsDir, 'Contract 2024.pdf');
    const sidecarDestination = path.join(documentsDir, 'Contract 2024.md');

    await fs.writeFile(sourcePath, 'pdf');
    await fs.writeFile(sidecarSource, '# OCR text');

    const originalRename = fs.rename;
    let renameCalls = 0;
    vi.spyOn(fs, 'rename').mockImplementation((from, to) => {
      renameCalls++;
      if (renameCalls === 2) {
        throw new Error('disk full');
      }
      return originalRename.call(fs, from, to);
    });
    vi.spyOn(tui.log, 'warn').mockImplementation(() => {});

    await expect(
      moveFilePair(sourcePath, destinationPath, '.md')
    ).resolves.toBe('failed');
    await expect(fs.readFile(destinationPath, 'utf8')).resolves.toBe('pdf');
    await expect(fs.readFile(sidecarSource, 'utf8')).resolves.toBe(
      '# OCR text'
    );
    await expect(fs.access(sidecarDestination)).rejects.toThrow(/ENOENT/);
  });

  test('returns failed when moving the primary file alone fails', async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), 'files-move-primary-')
    );
    const inboxDir = path.join(root, 'Inbox');
    const documentsDir = path.join(root, 'Documents', 'Work');
    await fs.mkdir(inboxDir, { recursive: true });
    await fs.mkdir(documentsDir, { recursive: true });

    const sourcePath = path.join(inboxDir, 'scan.pdf');
    const destinationPath = path.join(documentsDir, 'Contract 2024.pdf');

    await fs.writeFile(sourcePath, 'pdf');

    vi.spyOn(fs, 'rename').mockRejectedValue(new Error('permission denied'));
    vi.spyOn(tui.log, 'warn').mockImplementation(() => {});

    await expect(moveFilePair(sourcePath, destinationPath)).resolves.toBe(
      'failed'
    );
    await expect(fs.readFile(sourcePath, 'utf8')).resolves.toBe('pdf');
  });
});

describe(toFilename, () => {
  test('removes invalid filename characters and trims', () => {
    expect(toFilename(' Payslip 2026-04 ')).toBe('Payslip 2026-04');
    expect(toFilename('Tax: return/2024')).toBe('Tax return 2024');
  });
});

describe(confirmOverwriteFile, () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'files-overwrite-'));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test('allows write when the file does not exist', async () => {
    const filePath = path.join(tmpDir, 'missing.html');
    const confirm = vi.spyOn(tui, 'confirm');

    await expect(confirmOverwriteFile(filePath)).resolves.toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  test('prompts when the file already exists', async () => {
    const filePath = path.join(tmpDir, 'existing.html');
    await fs.writeFile(filePath, 'old');
    const confirm = vi.spyOn(tui, 'confirm').mockResolvedValue(true);

    await expect(confirmOverwriteFile(filePath)).resolves.toBe(true);
    expect(confirm).toHaveBeenCalledWith(
      `File already exists: ${filePath.replace(os.homedir(), '~')}. Overwrite?`
    );
  });

  test('returns false when the user declines', async () => {
    const filePath = path.join(tmpDir, 'existing.html');
    await fs.writeFile(filePath, 'old');
    vi.spyOn(tui, 'confirm').mockResolvedValue(false);

    await expect(confirmOverwriteFile(filePath)).resolves.toBe(false);
  });
});
