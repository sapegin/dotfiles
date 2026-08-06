import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  getMarkdownSidecarPath,
  isDoclingExtractFresh,
  isDoclingSupportedDocument,
} from './ai.ts';

describe(getMarkdownSidecarPath, () => {
  test('places a markdown sidecar next to the source file', () => {
    expect(getMarkdownSidecarPath('/docs/Payslip 2026-04.pdf')).toBe(
      '/docs/Payslip 2026-04.md'
    );
  });
});

describe(isDoclingSupportedDocument, () => {
  test('accepts PDFs and images only', () => {
    expect(isDoclingSupportedDocument('scan.pdf')).toBe(true);
    expect(isDoclingSupportedDocument('scan.JPG')).toBe(true);
    expect(isDoclingSupportedDocument('sheet.xlsx')).toBe(false);
  });
});

describe(isDoclingExtractFresh, () => {
  test('returns false when the sidecar is missing', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'docling-fresh-'));
    const sourcePath = path.join(root, 'scan.pdf');
    await fs.writeFile(sourcePath, 'pdf');

    await expect(isDoclingExtractFresh(sourcePath)).resolves.toBe(false);
  });

  test('returns true when the sidecar is newer than the source', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'docling-fresh-'));
    const sourcePath = path.join(root, 'scan.pdf');
    const markdownPath = getMarkdownSidecarPath(sourcePath);
    await fs.writeFile(sourcePath, 'pdf');
    await fs.writeFile(markdownPath, '# scan');

    const sourceMtime = new Date(Date.now() - 60_000);
    await fs.utimes(sourcePath, sourceMtime, sourceMtime);

    await expect(isDoclingExtractFresh(sourcePath)).resolves.toBe(true);
  });

  test('returns false when the sidecar is older than the source', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'docling-fresh-'));
    const sourcePath = path.join(root, 'scan.pdf');
    const markdownPath = getMarkdownSidecarPath(sourcePath);
    await fs.writeFile(markdownPath, '# scan');
    await fs.writeFile(sourcePath, 'updated pdf');

    await expect(isDoclingExtractFresh(sourcePath)).resolves.toBe(false);
  });
});
