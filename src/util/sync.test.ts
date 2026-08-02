import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { didFilesChange, mirrorFolder } from './sync.ts';

let destinationDirectory: string;
let sourceDirectory: string;
let temporaryDirectory: string;

async function writeFile(
  rootDirectory: string,
  relativePath: string,
  content: string
): Promise<void> {
  const filePath = path.join(rootDirectory, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

beforeEach(async () => {
  temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-test-'));
  sourceDirectory = path.join(temporaryDirectory, 'source');
  destinationDirectory = path.join(temporaryDirectory, 'destination');
  await Promise.all([
    fs.mkdir(sourceDirectory),
    fs.mkdir(destinationDirectory),
  ]);
});

afterEach(async () => {
  await fs.rm(temporaryDirectory, { recursive: true, force: true });
});

describe(mirrorFolder, () => {
  test('copies source changes, removes stale files, and preserves ignored paths', async () => {
    await Promise.all([
      writeFile(sourceDirectory, 'added.md', 'added\n'),
      writeFile(sourceDirectory, 'changed.md', 'current\n'),
      writeFile(sourceDirectory, 'equal.md', 'equal\n'),
      writeFile(sourceDirectory, 'ignored/guide.md', 'upstream\n'),
      writeFile(destinationDirectory, 'changed.md', 'stale\n'),
      writeFile(destinationDirectory, 'equal.md', 'equal\n'),
      writeFile(destinationDirectory, 'ignored/guide.md', 'local\n'),
      writeFile(destinationDirectory, 'obsolete/guide.md', 'obsolete\n'),
    ]);

    const future = new Date(Date.now() + 60_000);
    await fs.utimes(
      path.join(destinationDirectory, 'changed.md'),
      future,
      future
    );

    const entries = await mirrorFolder(sourceDirectory, destinationDirectory, [
      '^ignored/',
    ]);

    expect(
      entries.map(({ path: filePath, result }) => [
        path.relative(destinationDirectory, filePath),
        result,
      ])
    ).toStrictEqual([
      ['added.md', 'added'],
      ['changed.md', 'pulled'],
      ['equal.md', 'equal'],
      ['obsolete/guide.md', 'removed'],
    ]);
    expect(didFilesChange(entries)).toBe(true);
    expect(didFilesChange([{ path: 'removed.md', result: 'removed' }])).toBe(
      true
    );
    await expect(
      fs.readFile(path.join(destinationDirectory, 'changed.md'), 'utf8')
    ).resolves.toBe('current\n');
    await expect(
      fs.readFile(path.join(destinationDirectory, 'ignored/guide.md'), 'utf8')
    ).resolves.toBe('local\n');
    await expect(
      fs.stat(path.join(destinationDirectory, 'obsolete'))
    ).rejects.toMatchObject({ code: 'ENOENT' });

    const unchangedEntries = await mirrorFolder(
      sourceDirectory,
      destinationDirectory,
      ['^ignored/']
    );
    expect(didFilesChange(unchangedEntries)).toBe(false);
  });
});
