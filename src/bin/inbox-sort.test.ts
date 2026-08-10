import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { callApfel, extractDocument } from '../util/ai.ts';
import {
  buildFolderAllowList,
  buildDestinationPath,
  buildFolderOptions,
  buildSortSuggestion,
  buildSystemPrompt,
  getOriginalFilenameTitle,
  isAllowedFolder,
  isYearGroupedFolder,
  listExistingDocumentFolders,
  listInboxFiles,
  parseDocumentsSortConfig,
  yearFromDate,
} from './inbox-sort.ts';

vi.mock(import('../util/ai.ts'), async (importOriginal) => {
  const actual = await importOriginal<typeof import('../util/ai.ts')>();
  return {
    ...actual,
    callApfel: vi.fn<typeof actual.callApfel>() as typeof actual.callApfel,
    extractDocument: vi.fn<
      typeof actual.extractDocument
    >() as typeof actual.extractDocument,
  };
});

const SAMPLE_CONFIG = [
  {
    prompt:
      'Contract, HR, benefits, employment, work-related documents for Acme Inc',
    folder: 'Work',
  },
  {
    prompt: 'Huyacme employment documents',
    folder: 'z-Archive/Work/Huyacme',
    archived: true,
  },
  {
    prompt: 'Rent, utilities, landlord documents',
    folder: 'Home',
  },
  {
    prompt: 'Payslip and payroll documents',
    folder: 'Finance/Payslips',
  },
  {
    prompt: 'Tax assessment and tax office documents',
    folder: 'Finance/Taxes',
    groupBy: 'year',
  },
] as const;

describe(parseDocumentsSortConfig, () => {
  test('accepts a valid config', () => {
    const config = parseDocumentsSortConfig(SAMPLE_CONFIG);
    expect(config[0]?.folder).toBe('Work');
    expect(config[1]?.archived).toBe(true);
    expect(config[4]?.groupBy).toBe('year');
  });

  test('rejects missing folder', () => {
    expect(() =>
      parseDocumentsSortConfig([
        {
          prompt: 'Work documents',
        },
      ])
    ).toThrow(/\[0\]\.folder/);
  });

  test('rejects invalid groupBy', () => {
    expect(() =>
      parseDocumentsSortConfig([
        {
          prompt: 'Tax documents',
          folder: 'Finance/Taxes',
          groupBy: 'month',
        },
      ])
    ).toThrow(/groupBy must be "year"/);
  });
});

describe(buildFolderAllowList, () => {
  test('includes configured folders', () => {
    const config = parseDocumentsSortConfig(SAMPLE_CONFIG);
    const allowList = buildFolderAllowList(config);
    expect(allowList).toContain('Work');
    expect(allowList).toContain('Finance/Payslips');
    expect(allowList).toContain('z-Archive/Work/Huyacme');
  });
});

describe(isAllowedFolder, () => {
  const config = parseDocumentsSortConfig(SAMPLE_CONFIG);
  const allowList = buildFolderAllowList(config);

  test('accepts configured folders and year-grouped subfolders', () => {
    expect(isAllowedFolder('Work', allowList, config)).toBe(true);
    expect(isAllowedFolder('Finance/Taxes/2024', allowList, config)).toBe(true);
  });

  test('rejects unknown folders', () => {
    expect(isAllowedFolder('Misc', allowList, config)).toBe(false);
  });
});

describe(isYearGroupedFolder, () => {
  const config = parseDocumentsSortConfig(SAMPLE_CONFIG);

  test('matches year-grouped folders and subfolders', () => {
    expect(isYearGroupedFolder('Finance/Taxes/2024', config)).toBe(true);
    expect(isYearGroupedFolder('Finance/Taxes', config)).toBe(true);
    expect(isYearGroupedFolder('Finance/Payslips', config)).toBe(false);
  });
});

describe(buildDestinationPath, () => {
  test('joins documents root, folder, and sanitized title', () => {
    expect(
      buildDestinationPath(
        '/cloud/Documents',
        'Finance/Payslips',
        'Payslip',
        '.pdf'
      )
    ).toBe('/cloud/Documents/Finance/Payslips/Payslip.pdf');
  });
});

describe(listInboxFiles, () => {
  test('returns top-level supported files and ignores folders and dotfiles', async () => {
    const inboxDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'inbox-sort-list-')
    );
    await fs.writeFile(path.join(inboxDir, 'payslip.pdf'), 'pdf');
    await fs.writeFile(path.join(inboxDir, '.DS_Store'), 'ds');
    await fs.writeFile(path.join(inboxDir, 'notes.txt'), 'txt');

    await expect(listInboxFiles(inboxDir)).resolves.toStrictEqual([
      path.join(inboxDir, 'payslip.pdf'),
    ]);
  });

  test('throws when the inbox directory does not exist', async () => {
    await expect(
      listInboxFiles(path.join(os.tmpdir(), 'inbox-sort-missing-inbox'))
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

describe(buildSystemPrompt, () => {
  test('includes routing context and allow-list', () => {
    const config = parseDocumentsSortConfig(SAMPLE_CONFIG);
    const allowList = buildFolderAllowList(config);
    const prompt = buildSystemPrompt(config, allowList);

    expect(prompt).toContain('Acme Inc');
    expect(prompt).toContain('Finance/Payslips');
    expect(prompt).toContain('Finance/Taxes/{YYYY}');
    expect(prompt).toContain('YYYY-MM-DD');
    expect(prompt).toContain('Archived (avoid unless clearly matching)');
  });
});

describe(getOriginalFilenameTitle, () => {
  test('strips extension and sanitizes', () => {
    expect(getOriginalFilenameTitle('/Inbox/Scan 111.pdf')).toBe('Scan 111');
    expect(getOriginalFilenameTitle('/Inbox/bad:name.pdf')).toBe('bad name');
  });
});

describe(yearFromDate, () => {
  test('extracts year from partial and full dates', () => {
    expect(yearFromDate('2024-03-15')).toBe('2024');
    expect(yearFromDate('2024-03')).toBe('2024');
    expect(yearFromDate('2024')).toBe('2024');
    expect(yearFromDate('')).toBe('');
  });
});

describe(buildSortSuggestion, () => {
  const config = parseDocumentsSortConfig(SAMPLE_CONFIG);
  const allowList = buildFolderAllowList(config);
  const systemPrompt = buildSystemPrompt(config, allowList);

  beforeEach(() => {
    vi.mocked(callApfel).mockReset();
    vi.mocked(extractDocument).mockReset();
  });

  test('returns classification with metadata', async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), 'inbox-sort-suggest-')
    );
    const sourcePath = path.join(root, 'scan.pdf');
    const markdownPath = path.join(root, 'scan.md');
    await fs.writeFile(sourcePath, 'pdf');
    await fs.writeFile(markdownPath, '# Payslip content');

    vi.mocked(extractDocument).mockResolvedValue({
      sourcePath,
      markdownPath,
      skipped: false,
    });
    vi.mocked(callApfel).mockReturnValueOnce({
      folder: 'Finance/Payslips',
      title: 'Payslip',
      date: '2026-04',
      name: '',
    });

    await expect(
      buildSortSuggestion(sourcePath, systemPrompt, allowList, config)
    ).resolves.toStrictEqual({
      sourcePath,
      folder: 'Finance/Payslips',
      title: 'Payslip',
      date: '2026-04',
      name: '',
      warnings: [],
    });
  });

  test('appends year to year-grouped folders', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'inbox-sort-year-'));
    const sourcePath = path.join(root, 'scan.pdf');
    const markdownPath = path.join(root, 'scan.md');
    await fs.writeFile(sourcePath, 'pdf');
    await fs.writeFile(markdownPath, '# Tax assessment');

    vi.mocked(extractDocument).mockResolvedValue({
      sourcePath,
      markdownPath,
      skipped: false,
    });
    vi.mocked(callApfel).mockReturnValueOnce({
      folder: 'Finance/Taxes',
      title: 'Tax assessment',
      date: '2024',
      name: '',
    });

    await expect(
      buildSortSuggestion(sourcePath, systemPrompt, allowList, config)
    ).resolves.toMatchObject({
      folder: 'Finance/Taxes/2024',
      title: 'Tax assessment',
      date: '2024',
    });
  });

  test('falls back when OCR fails', async () => {
    const sourcePath = '/Inbox/scan.pdf';
    vi.mocked(extractDocument).mockRejectedValue(new Error('docling missing'));

    await expect(
      buildSortSuggestion(sourcePath, systemPrompt, allowList, config)
    ).resolves.toStrictEqual({
      sourcePath,
      folder: '',
      title: 'scan',
      date: '',
      name: '',
      warnings: ['OCR failed: docling missing'],
    });
  });

  test('falls back when OCR text is empty', async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), 'inbox-sort-empty-ocr-')
    );
    const sourcePath = path.join(root, 'scan.pdf');
    const markdownPath = path.join(root, 'scan.md');
    await fs.writeFile(sourcePath, 'pdf');
    await fs.writeFile(markdownPath, '   ');

    vi.mocked(extractDocument).mockResolvedValue({
      sourcePath,
      markdownPath,
      skipped: false,
    });

    await expect(
      buildSortSuggestion(sourcePath, systemPrompt, allowList, config)
    ).resolves.toStrictEqual({
      sourcePath,
      folder: '',
      title: 'scan',
      date: '',
      name: '',
      warnings: ['Empty OCR text'],
    });
  });

  test('falls back when classification fails', async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), 'inbox-sort-classify-')
    );
    const sourcePath = path.join(root, 'scan.pdf');
    const markdownPath = path.join(root, 'scan.md');
    await fs.writeFile(sourcePath, 'pdf');
    await fs.writeFile(markdownPath, '# Payslip content');

    vi.mocked(extractDocument).mockResolvedValue({
      sourcePath,
      markdownPath,
      skipped: false,
    });
    vi.mocked(callApfel).mockImplementation(() => {
      throw new Error('apfel unavailable');
    });

    await expect(
      buildSortSuggestion(sourcePath, systemPrompt, allowList, config)
    ).resolves.toStrictEqual({
      sourcePath,
      folder: '',
      title: 'scan',
      date: '',
      name: '',
      warnings: ['Classification failed: apfel unavailable'],
    });
  });

  test('falls back when apfel rejects the document language', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'inbox-sort-ru-'));
    const sourcePath = path.join(root, 'passport.pdf');
    const markdownPath = path.join(root, 'passport.md');
    await fs.writeFile(sourcePath, 'pdf');
    await fs.writeFile(
      markdownPath,
      'Паспорт гражданина Российской Федерации. Фамилия: Иванов.'
    );

    vi.mocked(extractDocument).mockResolvedValue({
      sourcePath,
      markdownPath,
      skipped: false,
    });
    vi.mocked(callApfel).mockImplementation(() => {
      throw new Error(
        '[unsupported language] Unsupported language: An unsupported language or locale was used'
      );
    });

    await expect(
      buildSortSuggestion(sourcePath, systemPrompt, allowList, config)
    ).resolves.toStrictEqual({
      sourcePath,
      folder: '',
      title: 'passport',
      date: '',
      name: '',
      warnings: [
        'Classification failed: [unsupported language] Unsupported language: An unsupported language or locale was used',
      ],
    });
  });

  test('warns when classification picks an unknown folder', async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), 'inbox-sort-unknown-')
    );
    const sourcePath = path.join(root, 'scan.pdf');
    const markdownPath = path.join(root, 'scan.md');
    await fs.writeFile(sourcePath, 'pdf');
    await fs.writeFile(markdownPath, '# Payslip content');

    vi.mocked(extractDocument).mockResolvedValue({
      sourcePath,
      markdownPath,
      skipped: false,
    });
    vi.mocked(callApfel).mockReturnValueOnce({
      folder: 'Misc',
      title: 'Payslip',
      date: '2026-04',
      name: '',
    });

    await expect(
      buildSortSuggestion(sourcePath, systemPrompt, allowList, config)
    ).resolves.toStrictEqual({
      sourcePath,
      folder: 'Misc',
      title: 'Payslip',
      date: '2026-04',
      name: '',
      warnings: ['Unknown folder "Misc"'],
    });
  });
});

describe(buildFolderOptions, () => {
  test('merges allow-list folders with folders on disk', async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), 'inbox-sort-folders-')
    );
    await fs.mkdir(path.join(root, 'Work'), { recursive: true });
    await fs.mkdir(path.join(root, 'Finance/Payslips'), { recursive: true });

    const allowList = buildFolderAllowList(
      parseDocumentsSortConfig(SAMPLE_CONFIG)
    );
    const options = await buildFolderOptions(root, allowList);

    expect(options).toContain('Work');
    expect(options).toContain('Finance/Payslips');
  });
});

describe(listExistingDocumentFolders, () => {
  test('lists nested folders relative to the documents root', async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), 'inbox-sort-existing-')
    );
    await fs.mkdir(path.join(root, 'Home'), { recursive: true });
    await fs.mkdir(path.join(root, 'Finance/Taxes/2024'), { recursive: true });

    await expect(listExistingDocumentFolders(root)).resolves.toStrictEqual([
      'Finance',
      'Finance/Taxes',
      'Finance/Taxes/2024',
      'Home',
    ]);
  });
});
