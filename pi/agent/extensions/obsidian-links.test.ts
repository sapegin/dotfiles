import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  type ExtensionAPI,
  type ExtensionContext,
} from '@earendil-works/pi-coding-agent';
import { type AutocompleteProvider } from '@earendil-works/pi-tui';
import { afterEach, describe, expect, test, vi } from 'vitest';
import registerObsidianLinks, {
  createVaultAutocompleteProvider,
  expandVaultReferences,
  filterVaultFiles,
  hasVaultReference,
  listVaultMarkdownFiles,
  type VaultFile,
} from './obsidian-links.ts';

const temporaryDirectories: string[] = [];

const files: VaultFile[] = [
  {
    absolutePath: '/vault/Specs/Pizza.md',
    relativePath: 'Specs/Pizza.md',
  },
  {
    absolutePath: '/vault/Work/Deployment automation.md',
    relativePath: 'Work/Deployment automation.md',
  },
];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { force: true, recursive: true }))
  );
});

describe('obsidian links extension', () => {
  test('does not index the vault during session startup', () => {
    const realpath = vi.spyOn(fs, 'realpath');
    const on = vi.fn<ExtensionAPI['on']>();
    const addAutocompleteProvider =
      vi.fn<ExtensionContext['ui']['addAutocompleteProvider']>();
    registerObsidianLinks({ on } as unknown as ExtensionAPI);
    const calls = on.mock.calls as unknown as [string, unknown][];
    const sessionStart = calls.find(
      ([eventName]) => eventName === 'session_start'
    )?.[1] as (event: unknown, ctx: ExtensionContext) => void;

    sessionStart({}, {
      mode: 'tui',
      ui: { addAutocompleteProvider },
    } as unknown as ExtensionContext);

    expect(addAutocompleteProvider).toHaveBeenCalledOnce();
    expect(realpath).not.toHaveBeenCalled();
  });
});

describe(listVaultMarkdownFiles, () => {
  test('indexes Markdown files and excludes hidden directories', async () => {
    const vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-vault-'));
    temporaryDirectories.push(vaultPath);
    await fs.mkdir(path.join(vaultPath, 'Work'));
    await fs.mkdir(path.join(vaultPath, '.obsidian'));
    await Promise.all([
      fs.writeFile(path.join(vaultPath, 'Work', 'Spec.md'), ''),
      fs.writeFile(path.join(vaultPath, 'Work', 'notes.txt'), ''),
      fs.writeFile(path.join(vaultPath, '.obsidian', 'Internal.md'), ''),
    ]);

    const resolvedVaultPath = await fs.realpath(vaultPath);
    await expect(listVaultMarkdownFiles(vaultPath)).resolves.toStrictEqual([
      {
        absolutePath: path.join(resolvedVaultPath, 'Work', 'Spec.md'),
        relativePath: path.join('Work', 'Spec.md'),
      },
    ]);
  });
});

describe(hasVaultReference, () => {
  test.each([
    '#Specs/Pizza.md',
    'Read #Specs/Pizza.md',
    'Read #"Work/Deployment automation.md"',
  ])('recognizes %s', (input) => {
    expect(hasVaultReference(input)).toBe(true);
  });

  test.each(['No reference', 'C# code', '#'])('ignores %s', (input) => {
    expect(hasVaultReference(input)).toBe(false);
  });
});

describe(expandVaultReferences, () => {
  test('expands plain and quoted references to absolute @ paths', () => {
    expect(
      expandVaultReferences(
        'Compare #Specs/Pizza.md with #"Work/Deployment automation.md"',
        files
      )
    ).toBe(
      'Compare @"/vault/Specs/Pizza.md" with @"/vault/Work/Deployment automation.md"'
    );
  });

  test('leaves ordinary hashtags and unknown paths unchanged', () => {
    const input = 'Discuss #planning and unknown #Specs/Pasta.md';
    expect(expandVaultReferences(input, files)).toBe(input);
  });
});

describe(filterVaultFiles, () => {
  test('fuzzy-matches paths and quotes completions containing spaces', () => {
    expect(filterVaultFiles(files, 'deploy')).toStrictEqual([
      {
        description: 'Obsidian vault',
        label: '#"Work/Deployment automation.md"',
        value: '#"Work/Deployment automation.md"',
      },
    ]);
  });
});

describe(createVaultAutocompleteProvider, () => {
  test('offers vault paths for a hash reference and delegates insertion', async () => {
    const applyCompletion = vi.fn<AutocompleteProvider['applyCompletion']>(
      () => ({
        cursorCol: 15,
        cursorLine: 0,
        lines: ['Read #Specs/Pizza.md'],
      })
    );
    const current = {
      applyCompletion,
      getSuggestions: vi.fn<AutocompleteProvider['getSuggestions']>(() =>
        Promise.resolve(null)
      ),
    } satisfies AutocompleteProvider;
    const provider = createVaultAutocompleteProvider(current, () =>
      Promise.resolve(files)
    );

    const suggestions = await provider.getSuggestions(['Read #pizza'], 0, 11, {
      signal: new AbortController().signal,
    });

    expect(provider.triggerCharacters).toStrictEqual(['#']);
    expect(suggestions).toStrictEqual({
      items: [
        {
          description: 'Obsidian vault',
          label: '#Specs/Pizza.md',
          value: '#Specs/Pizza.md',
        },
      ],
      prefix: '#pizza',
    });

    const item = suggestions?.items[0];
    expect(item).toBeDefined();
    if (item) {
      provider.applyCompletion(['Read #pizza'], 0, 11, item, '#pizza');
    }
    expect(applyCompletion).toHaveBeenCalledOnce();
  });
});
