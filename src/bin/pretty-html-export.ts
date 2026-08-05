// Bundle a pretty-html page and its _assets into one self-contained file.
//
// - Export to ~/Downloads:
//
// `pretty-html-export pretty-html/example.html`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { dirs, confirmOverwriteFile } from '../util/files.ts';
import { run } from '../util/tui.ts';

const OPTIONS = [
  {
    name: 'file',
    positional: true,
    required: true,
  },
] as const;

const CSS_IMPORT_RE =
  /@import\s+(?:url\(\s*['"]?([^'")]+)['"]?\s*\)|['"]([^'"]+)['"])\s*;?/g;

const CSS_URL_RE = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;

const LINK_STYLESHEET_RE = /<link\b(?=[^>]*\brel=["']stylesheet["'])[^>]*>/gi;

const SCRIPT_EXTERNAL_RE =
  /<script\b(?=[^>]*\bsrc=["'][^"']+["'])[^>]*>\s*<\/script>/gi;

const IMG_SRC_RE = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;

const BREADCRUMBS_RE =
  /<nav\b(?=[^>]*\bclass=["'][^"']*\bbreadcrumbs\b)[^>]*>[\s\S]*?<\/nav>\s*/gi;

const HREF_RE = /\bhref=["']([^"']+)["']/i;
const SRC_RE = /\bsrc=["']([^"']+)["']/i;

const COMPONENTS_PATCH_FROM =
  "await loadScript(assetBase + 'lib/mermaid.min.js');";
const COMPONENTS_PATCH_TO =
  "if (!globalThis.mermaid) await loadScript(assetBase + 'lib/mermaid.min.js');";

const MIME_BY_EXT: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

export type Options = ParsedArgs<typeof OPTIONS>;

function isRemoteUrl(url: string): boolean {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url) || /^data:/i.test(url);
}

function escapeScriptContent(source: string): string {
  return source.replaceAll(/<\/script/gi, '<\\/script');
}

function mimeFromExt(extension: string): string {
  return MIME_BY_EXT[extension.toLowerCase()] ?? 'application/octet-stream';
}

function toDataUrl(filePath: string): string {
  const data = fs.readFileSync(filePath);
  const mime = mimeFromExt(path.extname(filePath));
  return `data:${mime};base64,${data.toString('base64')}`;
}

/** Bundle a CSS file, inlining `@import` and local `url(...)` assets. */
export function bundleCss(cssPath: string, seen = new Set<string>()): string {
  const absolutePath = path.resolve(cssPath);
  if (seen.has(absolutePath)) {
    return '';
  }
  seen.add(absolutePath);

  let css = fs.readFileSync(absolutePath, 'utf8');
  const cssDir = path.dirname(absolutePath);

  css = css.replace(CSS_IMPORT_RE, (_match, urlImport, quotedImport) => {
    const reference = urlImport ?? quotedImport;
    const importedPath = path.resolve(cssDir, reference);
    return bundleCss(importedPath, seen);
  });

  css = css.replace(CSS_URL_RE, (match, reference: string) => {
    if (isRemoteUrl(reference)) {
      return match;
    }
    const assetPath = path.resolve(cssDir, reference);
    return `url(${toDataUrl(assetPath)})`;
  });

  return css;
}

/** Patch components.js so inlined vendor scripts load without extra requests. */
export function patchComponentsJs(source: string): string {
  if (!source.includes(COMPONENTS_PATCH_FROM)) {
    throw new Error(
      'components.js is missing the expected mermaid loader — update pretty-html-export'
    );
  }
  return source.replace(COMPONENTS_PATCH_FROM, COMPONENTS_PATCH_TO);
}

function resolveLocalAsset(baseDir: string, reference: string): string {
  if (isRemoteUrl(reference)) {
    throw new Error(`Remote asset is not supported: ${reference}`);
  }
  return path.resolve(baseDir, reference);
}

function inlineStylesheets(html: string, htmlDir: string): string {
  return html.replace(LINK_STYLESHEET_RE, (linkTag) => {
    const hrefMatch = HREF_RE.exec(linkTag);
    if (hrefMatch === null) {
      throw new Error('Stylesheet link is missing href');
    }

    const cssPath = resolveLocalAsset(htmlDir, hrefMatch[1]);
    const css = bundleCss(cssPath);
    return `<style>\n${css}\n</style>`;
  });
}

function inlineComponentsScript(html: string, htmlDir: string): string {
  let assetsDir: string | undefined;

  const updatedHtml = html.replace(SCRIPT_EXTERNAL_RE, (scriptTag) => {
    const srcMatch = SRC_RE.exec(scriptTag);
    if (srcMatch === null) {
      throw new Error('External script tag is missing src');
    }

    const scriptPath = resolveLocalAsset(htmlDir, srcMatch[1]);
    if (!scriptPath.endsWith(`${path.sep}components.js`)) {
      throw new Error(
        `Unsupported external script (expected components.js): ${srcMatch[1]}`
      );
    }

    assetsDir = path.dirname(scriptPath);
    const highlightJs = fs.readFileSync(
      path.join(assetsDir, 'lib/highlight.min.js'),
      'utf8'
    );
    const mermaidJs = fs.readFileSync(
      path.join(assetsDir, 'lib/mermaid.min.js'),
      'utf8'
    );
    const componentsJs = patchComponentsJs(fs.readFileSync(scriptPath, 'utf8'));

    return [
      `<script>\n${escapeScriptContent(highlightJs)}\n</script>`,
      `<script>\n${escapeScriptContent(mermaidJs)}\n</script>`,
      `<script>\n${escapeScriptContent(componentsJs)}\n</script>`,
    ].join('\n');
  });

  if (assetsDir === undefined) {
    throw new Error('Pretty HTML page is missing components.js script tag');
  }

  return updatedHtml;
}

function inlineImages(html: string, htmlDir: string): string {
  return html.replace(IMG_SRC_RE, (imgTag, reference: string) => {
    if (isRemoteUrl(reference)) {
      return imgTag;
    }

    const imagePath = resolveLocalAsset(htmlDir, reference);
    const dataUrl = toDataUrl(imagePath);
    return imgTag.replace(reference, dataUrl);
  });
}

/** Remove handbook navigation; exports are meant to stand alone. */
export function removeBreadcrumbs(html: string): string {
  return html.replace(BREADCRUMBS_RE, '');
}

function assertNoLocalAssetReferences(html: string): void {
  if (/(?:href|src)=["'][^"']*_assets\//i.test(html)) {
    throw new Error('Export still references _assets paths');
  }
}

/** Bundle a pretty-html page and its _assets into one self-contained HTML file. */
export function exportPrettyHtml(htmlPath: string): string {
  const absoluteHtmlPath = path.resolve(htmlPath);
  const htmlDir = path.dirname(absoluteHtmlPath);
  let html = fs.readFileSync(absoluteHtmlPath, 'utf8');

  html = removeBreadcrumbs(html);
  html = inlineStylesheets(html, htmlDir);

  // Before vendor scripts are inlined — their source matches `<img src="…">`.
  html = inlineImages(html, htmlDir);
  html = inlineComponentsScript(html, htmlDir);
  assertNoLocalAssetReferences(html);

  return html;
}

export async function prettyHtmlExport({ file }: Options): Promise<void> {
  const bundled = exportPrettyHtml(file);
  const destination = path.join(dirs.downloads, path.basename(file));

  if ((await confirmOverwriteFile(destination)) === false) {
    return;
  }

  fs.writeFileSync(destination, bundled);

  console.log(`Exported to: ${destination}`);
}

await run(import.meta.url, () => prettyHtmlExport(parseArgs(OPTIONS)));
