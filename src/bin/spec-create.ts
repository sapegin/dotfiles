// Save a spec from stdin without overwriting an existing document.
//
// `spec-create "Subject" < /tmp/spec.md`

import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { dirs, doesPathExist, toFilename } from '../util/files.ts';
import { findGitRoot } from '../util/git.ts';
import { toKebabCase } from '../util/text.ts';
import { run, UserError } from '../util/tui.ts';

const OPTIONS = [
  { name: 'subject', positional: true, required: true },
] as const;
export type Options = ParsedArgs<typeof OPTIONS>;

/** Choose the project or vault destination and create a collision-safe spec. */
export async function specCreate(
  { subject }: Options,
  content: string,
  cwd = process.cwd(),
  vault = dirs.obsidianVault
): Promise<string> {
  if (content.trim() === '') {
    throw new UserError('Spec content must not be empty.');
  }
  const root = (await findGitRoot(cwd)) ?? cwd;
  const projectSpecs = path.join(root, 'specs');
  const projectStats = (await doesPathExist(projectSpecs))
    ? await fs.stat(projectSpecs)
    : undefined;
  const useProject = projectStats?.isDirectory() === true;
  const directory = useProject ? projectSpecs : path.join(vault, 'Specs');
  const name = useProject ? toKebabCase(subject) : toFilename(subject);
  if (name === '' || name === '.' || name === '..') {
    throw new UserError('Subject must contain a usable filename.');
  }
  if ((await doesPathExist(directory)) === false) {
    throw new UserError(`Spec directory does not exist: ${directory}`);
  }
  for (let suffix = 1; ; suffix++) {
    const destination = path.join(
      directory,
      `${name}${suffix === 1 ? '' : `-${suffix}`}.md`
    );
    try {
      // Exclusive creation also protects against simultaneous writers and symlinks.
      await fs.writeFile(destination, content, { flag: 'wx' });
      return destination;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

await run(import.meta.url, async () => {
  const options = parseArgs(OPTIONS);
  if (process.stdin.isTTY) {
    throw new UserError('Pass the spec Markdown on stdin.');
  }
  console.log(await specCreate(options, fsSync.readFileSync(0, 'utf8')));
});
