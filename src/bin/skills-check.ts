// Check skill metadata, local file links, and Readme.md inventory coverage.
// Shared reference targets are checked, but vendored reference contents are not.
//
// `skills-check`

import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { parseArgs } from '../util/args.ts';
import { getMarkdownLinks, resolveDocumentLink } from '../util/docs.ts';
import { dirs, doesPathExist } from '../util/files.ts';
import { parseFrontmatter } from '../util/markdown.ts';
import { run, UserError } from '../util/tui.ts';

const OPTIONS = [] as const;

/**
 * Check every skill without interpreting prompt quality or fetching remote
 * URLs.
 */
export async function skillsCheck(
  root = path.join(dirs.ai, 'skills')
): Promise<void> {
  const files = await Array.fromAsync(
    fs.glob('**/*.md', { cwd: root, exclude: ['_references/**'] })
  );
  const skills = files
    .filter((file) => path.basename(file) === 'SKILL.md')
    .toSorted();
  const errors: string[] = [];
  const entries: string[] = [];
  if (skills.length === 0) {
    errors.push('No SKILL.md files found.');
  }
  for (const file of files.toSorted()) {
    const absolutePath = path.join(root, file);
    const source = await fs.readFile(absolutePath, 'utf8');
    if (path.basename(file) === 'SKILL.md') {
      try {
        const { frontmatter: metadata } =
          parseFrontmatter<Record<string, unknown>>(source);
        const name = path.basename(path.dirname(file));
        if (
          metadata.name !== name ||
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) === false ||
          typeof metadata.description !== 'string' ||
          metadata.description.trim() === ''
        ) {
          errors.push(
            `${file}: frontmatter needs a matching name and non-empty description.`
          );
        } else {
          for (const flag of ['disable-model-invocation', 'user-invocable']) {
            if (
              metadata[flag] !== undefined &&
              typeof metadata[flag] !== 'boolean'
            ) {
              errors.push(`${file}: ${flag} must be a boolean.`);
            }
          }
        }
      } catch (error) {
        if (error instanceof YAML.YAMLParseError === false) {
          throw error;
        }
        errors.push(`${file}: invalid YAML: ${error.message}`);
      }
    }
    for (const href of getMarkdownLinks(source)) {
      try {
        const target = resolveDocumentLink(absolutePath, href);
        if (
          file === 'Readme.md' &&
          target !== undefined &&
          path.basename(target) === 'SKILL.md'
        ) {
          entries.push(target);
        }
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
  if (files.includes('Readme.md')) {
    for (const skill of skills) {
      const count = entries.filter(
        (target) => target === path.join(root, skill)
      ).length;
      if (count !== 1) {
        errors.push(
          `Readme.md: expected one entry for ${skill}, found ${count}.`
        );
      }
    }
    for (const entry of entries) {
      if (skills.includes(path.relative(root, entry)) === false) {
        errors.push(
          `Readme.md: unknown skill entry: ${path.relative(root, entry)}`
        );
      }
    }
  } else {
    errors.push('Readme.md: missing skill inventory.');
  }
  if (errors.length > 0) {
    throw new UserError(errors.join('\n'));
  }
  console.log(
    `Checked ${skills.length} skills and ${files.length} Markdown files.`
  );
}

await run(import.meta.url, async () => {
  parseArgs(OPTIONS);
  await skillsCheck();
});
