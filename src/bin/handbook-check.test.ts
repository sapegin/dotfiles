import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { handbookCheck } from './handbook-check.ts';

let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'handbook-check-'));
  await fs.mkdir(path.join(root, 'css'));
  await fs.mkdir(path.join(root, '_assets'));
  await fs.writeFile(
    path.join(root, '_index.yaml'),
    'css:\n  layout:\n    file: css/layout.html\n    title: Layout\n    keywords: [grid, flexbox]\n'
  );
  await fs.writeFile(
    path.join(root, 'index.html'),
    '<a href="css/index.html">CSS</a>'
  );
  await fs.writeFile(path.join(root, 'glossary.html'), '<h1>Glossary</h1>');
  await fs.writeFile(
    path.join(root, 'css/index.html'),
    '<a href="layout.html">Layout</a>'
  );
  await fs.writeFile(
    path.join(root, 'css/layout.html'),
    '<a href="../glossary.html#layout">Glossary</a><link rel="stylesheet" href="../_assets/doc.css">'
  );
  await fs.writeFile(path.join(root, '_assets/doc.css'), '');
});
afterEach(() => fs.rm(root, { recursive: true, force: true }));

test('accepts topic hubs without routing metadata and preserves the handbook', async () => {
  const before = await fs.readFile(path.join(root, '_index.yaml'), 'utf8');
  await expect(handbookCheck(root)).resolves.toBeUndefined();
  await expect(
    fs.readFile(path.join(root, '_index.yaml'), 'utf8')
  ).resolves.toBe(before);
});

test('checks local links in topic hubs without routing metadata', async () => {
  await fs.appendFile(
    path.join(root, 'css/index.html'),
    '<a href="missing.html">Missing</a>'
  );
  await expect(handbookCheck(root)).rejects.toThrow(
    'css/index.html: missing local target: missing.html'
  );
});

test('reports stale routing entries, missing hubs, and unindexed documents', async () => {
  await fs.rm(path.join(root, 'css/index.html'));
  await fs.rm(path.join(root, 'css/layout.html'));
  await fs.writeFile(path.join(root, 'css/other.html'), '<h1>Other</h1>');
  await expect(handbookCheck(root)).rejects.toThrow('missing topic hub');
  await expect(handbookCheck(root)).rejects.toThrow(
    'missing file: css/layout.html'
  );
  await expect(handbookCheck(root)).rejects.toThrow(
    'css/other.html: missing valid _index.yaml entry'
  );
});

test('checks authored links and script assets but excludes live demos and code', async () => {
  await fs.appendFile(
    path.join(root, 'css/layout.html'),
    '<ss-demo><a href="demo.html">Demo</a></ss-demo><pre>&lt;a href="code.html"&gt;</pre><a href="https://example.com/">Remote</a><script src="../_assets/components.js"></script>'
  );
  await expect(handbookCheck(root)).rejects.toThrow(
    'missing local target: ../_assets/components.js'
  );
  await fs.writeFile(path.join(root, '_assets/components.js'), '');
  await expect(handbookCheck(root)).resolves.toBeUndefined();
});

test('rejects unescaped markup inside ss-code examples', async () => {
  await fs.appendFile(
    path.join(root, 'css/layout.html'),
    '<ss-code language="jsx"><pre><button type="button">Save</button></pre></ss-code>'
  );
  await expect(handbookCheck(root)).rejects.toThrow(
    'unescaped markup in <ss-code><pre>'
  );
});

test('rejects invalid slugs and incorrectly typed keywords', async () => {
  await fs.writeFile(
    path.join(root, '_index.yaml'),
    'CSS: {}\ncss:\n  layout:\n    file: elsewhere.html\n    title: Layout\n    keywords: [123]\n'
  );
  await expect(handbookCheck(root)).rejects.toThrow('invalid topic: CSS');
  await expect(handbookCheck(root)).rejects.toThrow('needs matching slugs');
});

test('reports malformed and missing routing maps', async () => {
  await fs.writeFile(path.join(root, '_index.yaml'), 'css: [');
  await expect(handbookCheck(root)).rejects.toThrow('_index.yaml:');
  await fs.rm(path.join(root, '_index.yaml'));
  await expect(handbookCheck(root)).rejects.toThrow('index does not exist');
});
