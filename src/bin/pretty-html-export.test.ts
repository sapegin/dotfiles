import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import {
  bundleCss,
  exportPrettyHtml,
  patchComponentsJs,
  prettyHtmlExport,
  removeBreadcrumbs,
} from './pretty-html-export.ts';

const EXAMPLE_HTML = path.join(
  import.meta.dirname,
  '../../pretty-html/example.html'
);
const ASSETS_DIR = path.join(import.meta.dirname, '../../pretty-html/_assets');

describe('pretty-html-export import', () => {
  test('does not run on import', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    expect(prettyHtmlExport).toBeTypeOf('function');
    expect(exit).not.toHaveBeenCalled();
    exit.mockRestore();
  });
});

describe('pretty-html-export', () => {
  test('bundles CSS imports', () => {
    const css = bundleCss(path.join(ASSETS_DIR, 'doc.css'));
    expect(css).toContain('.light');
    expect(css).toContain('ss-callout');
    expect(css).not.toMatch(/@import/);
  });

  test('removes breadcrumbs nav', () => {
    const html = `<main>
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="../index.html">Handbook</a>
      </nav>
      <h1>Title</h1>
    </main>`;
    expect(removeBreadcrumbs(html)).not.toContain('breadcrumbs');
    expect(removeBreadcrumbs(html)).toContain('<h1>Title</h1>');
  });

  test('patches components.js for inlined vendors', () => {
    const source = fs.readFileSync(
      path.join(ASSETS_DIR, 'components.js'),
      'utf8'
    );
    const patched = patchComponentsJs(source);
    expect(patched).toContain('if (!globalThis.mermaid)');
  });

  test('exports example.html without external _assets references', () => {
    const outputDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'pretty-html-export-')
    );
    const outputPath = path.join(outputDir, 'example.html');

    const bundled = exportPrettyHtml(EXAMPLE_HTML);
    fs.writeFileSync(outputPath, bundled);

    expect(bundled).toContain('<style>');
    expect(bundled).toContain('<ss-callout');
    expect(bundled).toContain('customElements.define(');
    expect(bundled).not.toMatch(/(?:href|src)=["'][^"']*_assets\//);

    fs.rmSync(outputDir, { recursive: true, force: true });
  });
});
