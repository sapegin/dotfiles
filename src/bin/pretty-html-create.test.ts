import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { prettyHtmlCreate } from './pretty-html-create.ts';

const prettyHtmlRoot = path.resolve(import.meta.dirname, '../../pretty-html');
let directory: string;
beforeEach(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pretty-html-create-'));
});
afterEach(() => fs.rm(directory, { recursive: true, force: true }));

test('creates the canonical shell with escaped title and calculated assets', async () => {
  const file = path.join(directory, 'deep/page.html');
  await prettyHtmlCreate({ file, title: '<Example> & "title" $&' });
  const content = await fs.readFile(file, 'utf8');
  expect(content).toContain(
    '<title>&lt;Example&gt; &amp; &quot;title&quot; $&amp;</title>'
  );
  expect(content).toContain(
    '<h1>&lt;Example&gt; &amp; &quot;title&quot; $&amp;</h1>'
  );
  expect(content).toContain(
    `href="${path.relative(path.dirname(file), path.join(prettyHtmlRoot, '_assets'))}/doc.css"`
  );
  expect(content).toContain("matchMedia('(prefers-color-scheme: dark)')");
  expect(content).not.toContain('Syntax highlighting');
  expect(content.match(/<script\b/g)).toHaveLength(2);
  expect(content).not.toContain('type="module"');
});

test('uses synced handbook assets and refuses overwrites', async () => {
  const handbook = path.join(directory, 'handbook');
  const file = path.join(handbook, 'css/layout.html');
  await prettyHtmlCreate({ file, title: 'Layout' }, prettyHtmlRoot, handbook);
  const content = await fs.readFile(file, 'utf8');
  expect(content).toContain('href="../_assets/doc.css"');
  expect(content).toContain('src="../_assets/components.js"');
  await expect(
    prettyHtmlCreate({ file, title: 'Replacement' }, prettyHtmlRoot, handbook)
  ).rejects.toThrow('already exists');
  await expect(fs.readFile(file, 'utf8')).resolves.toBe(content);
});

test('rejects invalid destinations and empty titles', async () => {
  await expect(
    prettyHtmlCreate({ file: path.join(directory, 'page.md'), title: 'Page' })
  ).rejects.toThrow('.html');
  await expect(
    prettyHtmlCreate({ file: path.join(directory, 'page.html'), title: '' })
  ).rejects.toThrow('non-empty');
});
