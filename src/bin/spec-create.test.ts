import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { specCreate } from './spec-create.ts';

let directory: string;
let project: string;
let vault: string;
beforeEach(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'spec-create-'));
  project = path.join(directory, 'project');
  vault = path.join(directory, 'vault');
  await fs.mkdir(path.join(project, '.git'), { recursive: true });
  await fs.mkdir(path.join(project, 'nested'));
  await fs.mkdir(path.join(vault, 'Specs'), { recursive: true });
});
afterEach(() => fs.rm(directory, { recursive: true, force: true }));

test('uses the repository root from nested directories and preserves content', async () => {
  await fs.mkdir(path.join(project, 'specs'));
  const content = '# Test subject\n\nExact content.\n';
  const destination = execFileSync(
    process.execPath,
    [path.join(import.meta.dirname, 'spec-create.ts'), 'Test subject'],
    {
      cwd: path.join(project, 'nested'),
      input: content,
      encoding: 'utf8',
    }
  ).trim();
  expect(destination).toBe(
    await fs.realpath(path.join(project, 'specs/test-subject.md'))
  );
  await expect(fs.readFile(destination, 'utf8')).resolves.toBe(content);
});

test('uses readable vault filenames without creating a project specs folder', async () => {
  const destination = await specCreate(
    { subject: 'API: A/B?' },
    '# API\n',
    project,
    vault
  );
  expect(destination).toBe(path.join(vault, 'Specs/API A B.md'));
  await expect(fs.readFile(destination, 'utf8')).resolves.toBe('# API\n');
  await expect(fs.stat(path.join(project, 'specs'))).rejects.toMatchObject({
    code: 'ENOENT',
  });
});

test('allocates unique suffixes for concurrent writes and existing symlinks', async () => {
  await fs.mkdir(path.join(project, 'specs'));
  const original = path.join(directory, 'original.md');
  await fs.writeFile(original, 'original');
  await fs.symlink(original, path.join(project, 'specs/subject.md'));
  const destinations = await Promise.all(
    Array.from({ length: 3 }, () =>
      specCreate({ subject: 'Subject' }, '# Subject\n', project, vault)
    )
  );
  expect(
    destinations.map((file) => path.basename(file)).toSorted()
  ).toStrictEqual(['subject-2.md', 'subject-3.md', 'subject-4.md']);
  await expect(fs.readFile(original, 'utf8')).resolves.toBe('original');
});

test('rejects empty content, unusable subjects, and a missing destination directory', async () => {
  await expect(
    specCreate({ subject: 'Test' }, ' ', project, vault)
  ).rejects.toThrow('must not be empty');
  await expect(
    specCreate({ subject: '../' }, 'text', project, vault)
  ).rejects.toThrow('usable filename');
  await fs.rm(path.join(vault, 'Specs'), { recursive: true });
  await expect(
    specCreate({ subject: 'Test' }, 'text', project, vault)
  ).rejects.toThrow('directory does not exist');
});
