// Create a pretty-html shell using example.html as the canonical template.
//
// `pretty-html-create path/to/page.html "Page title"`

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { dirs, untildify } from '../util/files.ts';
import { run, UserError } from '../util/tui.ts';

const OPTIONS = [
  { name: 'file', positional: true, required: true },
  { name: 'title', positional: true, required: true },
] as const;
export type Options = ParsedArgs<typeof OPTIONS>;

/** Create a shell with correct asset paths and no example content. */
export async function prettyHtmlCreate(
  { file, title }: Options,
  prettyHtmlRoot = path.join(dirs.dotfiles, 'pretty-html'),
  handbookRoot = path.join(dirs.obsidianVault, 'zz-handbook')
): Promise<string> {
  const destination = path.resolve(untildify(file));
  if (path.extname(destination) !== '.html' || title.trim() === '') {
    throw new UserError('Provide an .html destination and a non-empty title.');
  }
  const handbookPath = path.relative(handbookRoot, destination);
  const inHandbook =
    handbookPath !== '..' &&
    handbookPath.startsWith(`..${path.sep}`) === false &&
    path.isAbsolute(handbookPath) === false;
  const assets = path.join(
    inHandbook ? handbookRoot : prettyHtmlRoot,
    '_assets'
  );
  const prefix = path
    .relative(path.dirname(destination), assets)
    .split(path.sep)
    .map(encodeURIComponent)
    .join('/');
  const escapedTitle = title
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  const template = await fs.readFile(
    path.join(prettyHtmlRoot, 'example.html'),
    'utf8'
  );
  if (
    /<title>[^]*?<\/title>/.test(template) === false ||
    /<main>[^]*?<\/main>/.test(template) === false
  ) {
    throw new Error('example.html must contain a title and main element.');
  }
  const content = template
    .replace(/<title>[^]*?<\/title>/, () => `<title>${escapedTitle}</title>`)
    .replace(
      /<main>[^]*?<\/main>/,
      () =>
        `<main>
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <span aria-current="page">${escapedTitle}</span>
      </nav>
      <h1>${escapedTitle}</h1>
  </main>`
    )
    .replaceAll('"_assets/', () => `"${prefix}/`);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  try {
    await fs.writeFile(destination, content, { flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new UserError(`File already exists: ${destination}`);
    }
    throw error;
  }
  return destination;
}

await run(import.meta.url, async () => {
  console.log(await prettyHtmlCreate(parseArgs(OPTIONS)));
});
