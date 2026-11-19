// Check handbook routing metadata, topic hubs, and local file links.
//
// `handbook-check`

import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { parseArgs } from '../util/args.ts';
import { getHtmlLinks, resolveDocumentLink } from '../util/docs.ts';
import { dirs, doesPathExist } from '../util/files.ts';
import { isRecord } from '../util/json.ts';
import { run, UserError } from '../util/tui.ts';

const OPTIONS = [] as const;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Validate authored handbook files without editing the vault or synced assets. */
export async function handbookCheck(
  root = path.join(dirs.obsidianVault, 'zz-handbook')
): Promise<void> {
  const indexPath = path.join(root, '_index.yaml');
  if ((await doesPathExist(indexPath)) === false) {
    throw new UserError(`Handbook index does not exist: ${indexPath}`);
  }
  let index: unknown;
  try {
    index = YAML.parse(await fs.readFile(indexPath, 'utf8'));
  } catch (error) {
    if (error instanceof YAML.YAMLParseError === false) {
      throw error;
    }
    throw new UserError(`_index.yaml: ${error.message}`);
  }
  if (isRecord(index) === false) {
    throw new UserError('_index.yaml must contain a topic map.');
  }
  const errors: string[] = [];
  const indexedFiles = new Set<string>();
  for (const [topic, documents] of Object.entries(index)) {
    if (SLUG.test(topic) === false || isRecord(documents) === false) {
      errors.push(`_index.yaml: invalid topic: ${topic}`);
      continue;
    }
    indexedFiles.add(`${topic}/index.html`);
    if ((await doesPathExist(path.join(root, topic, 'index.html'))) === false) {
      errors.push(`${topic}/index.html: missing topic hub.`);
    }
    for (const [document, metadata] of Object.entries(documents)) {
      const expectedFile = `${topic}/${document}.html`;
      if (
        SLUG.test(document) === false ||
        isRecord(metadata) === false ||
        metadata.file !== expectedFile ||
        typeof metadata.title !== 'string' ||
        metadata.title.trim() === '' ||
        Array.isArray(metadata.keywords) === false ||
        metadata.keywords.some(
          (keyword) => typeof keyword !== 'string' || keyword.trim() === ''
        )
      ) {
        errors.push(
          `_index.yaml: ${topic}.${document} needs matching slugs and file, a title, and string keywords.`
        );
        continue;
      }
      indexedFiles.add(expectedFile);
      if ((await doesPathExist(path.join(root, expectedFile))) === false) {
        errors.push(`_index.yaml: missing file: ${expectedFile}`);
      }
    }
  }
  for (const required of ['index.html', 'glossary.html']) {
    if ((await doesPathExist(path.join(root, required))) === false) {
      errors.push(`${required}: missing handbook page.`);
    }
  }
  const files = await Array.fromAsync(
    fs.glob('**/*.html', { cwd: root, exclude: ['_assets/**'] })
  );
  for (const file of files.toSorted()) {
    if (path.dirname(file) !== '.' && indexedFiles.has(file) === false) {
      errors.push(`${file}: missing valid _index.yaml entry.`);
    }
    const source = await fs.readFile(path.join(root, file), 'utf8');
    for (const href of getHtmlLinks(source)) {
      try {
        const target = resolveDocumentLink(path.join(root, file), href);
        if (target !== undefined && (await doesPathExist(target)) === false) {
          errors.push(`${file}: missing local target: ${href}`);
        }
      } catch (error) {
        if (error instanceof URIError === false) {
          throw error;
        }
        errors.push(`${file}: invalid link encoding: ${href}`);
      }
    }
  }
  if (errors.length > 0) {
    throw new UserError(errors.join('\n'));
  }
  console.log(
    `Checked ${Object.keys(index).length} topics and ${files.length} HTML files.`
  );
}

await run(import.meta.url, async () => {
  parseArgs(OPTIONS);
  await handbookCheck();
});
