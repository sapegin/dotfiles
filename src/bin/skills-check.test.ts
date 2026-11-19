import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { skillsCheck } from './skills-check.ts';

let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-check-'));
  await fs.mkdir(path.join(root, 'example/references'), { recursive: true });
  await fs.mkdir(path.join(root, '_references'));
  await fs.writeFile(
    path.join(root, 'example/SKILL.md'),
    '---\nname: example\ndescription: An example skill.\ndisable-model-invocation: true\n---\n\nRead [guide](references/guide.md).\n'
  );
  await fs.writeFile(
    path.join(root, 'example/references/guide.md'),
    '[Shared](../../_references/shared.md)\n'
  );
  await fs.writeFile(
    path.join(root, '_references/shared.md'),
    'Shared guide\n'
  );
  await fs.writeFile(
    path.join(root, 'Readme.md'),
    '[Example](example/SKILL.md)\n'
  );
});
afterEach(() => fs.rm(root, { recursive: true, force: true }));

test('checks skills, local references, and inventory without rewriting files', async () => {
  const before = await fs.readFile(path.join(root, 'example/SKILL.md'), 'utf8');
  await expect(skillsCheck(root)).resolves.toBeUndefined();
  await expect(
    fs.readFile(path.join(root, 'example/SKILL.md'), 'utf8')
  ).resolves.toBe(before);
});

test('reports missing and duplicate inventory entries', async () => {
  await fs.writeFile(path.join(root, 'Readme.md'), '# Skills\n');
  await expect(skillsCheck(root)).rejects.toThrow(
    'expected one entry for example/SKILL.md, found 0'
  );
  await fs.writeFile(
    path.join(root, 'Readme.md'),
    '[One](example/SKILL.md)\n[Two](example/SKILL.md)\n'
  );
  await expect(skillsCheck(root)).rejects.toThrow('found 2');
});

test('checks local references but ignores code examples and remote URLs', async () => {
  await fs.appendFile(
    path.join(root, 'example/references/guide.md'),
    '\n~~~md\n[example](missing-example.md)\n~~~\n\n`[example](missing-inline.md)`\n[Remote](https://example.com/)\n[Missing](missing.md)\n'
  );
  await expect(skillsCheck(root)).rejects.toThrow(
    'references/guide.md: missing local target: missing.md'
  );
  await fs.writeFile(
    path.join(root, 'example/references/guide.md'),
    '[Encoded](../../_references/shared%2Emd#heading)\n'
  );
  await expect(skillsCheck(root)).resolves.toBeUndefined();
});

test('ignores placeholder links in list-contained fenced examples', async () => {
  await fs.appendFile(
    path.join(root, 'example/SKILL.md'),
    '\n1. Example:\n\n   ~~~md\n   [Placeholder](missing-example.md)\n   ~~~\n'
  );
  await expect(skillsCheck(root)).resolves.toBeUndefined();
  await fs.appendFile(
    path.join(root, 'example/SKILL.md'),
    '\n   [Missing](missing.md)\n'
  );
  await expect(skillsCheck(root)).rejects.toThrow(
    'example/SKILL.md: missing local target: missing.md'
  );
});

test('accepts CRLF frontmatter ending at EOF', async () => {
  await fs.writeFile(
    path.join(root, 'example/SKILL.md'),
    '---\r\nname: example\r\ndescription: Example\r\n---'
  );
  await expect(skillsCheck(root)).resolves.toBeUndefined();
});

test('rejects malformed frontmatter, mismatched names, and invalid flags', async () => {
  const file = path.join(root, 'example/SKILL.md');
  await fs.writeFile(file, '---\nname: wrong\ndescription: Example\n---\n');
  await expect(skillsCheck(root)).rejects.toThrow('matching name');
  await fs.writeFile(
    file,
    '---\nname: example\ndescription: Example\ndisable-model-invocation: "true"\n---\n'
  );
  await expect(skillsCheck(root)).rejects.toThrow('must be a boolean');
  await fs.writeFile(file, '---\nname: [\n---\n');
  await expect(skillsCheck(root)).rejects.toThrow('invalid YAML');
});

test('reports stale inventory links and invalid URI encoding', async () => {
  await fs.appendFile(
    path.join(root, 'Readme.md'),
    '[Gone](gone/SKILL.md)\n[Bad](bad%ZZ.md)\n'
  );
  await expect(skillsCheck(root)).rejects.toThrow('invalid link encoding');
});

test('rejects an empty inventory', async () => {
  await fs.rm(path.join(root, 'example'), { recursive: true });
  await expect(skillsCheck(root)).rejects.toThrow('No SKILL.md files found');
});
