/** Adds fuzzy `#` references for Markdown files in the Obsidian vault. */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  type ExtensionAPI,
  type ExtensionContext,
} from '@earendil-works/pi-coding-agent';
import {
  type AutocompleteItem,
  type AutocompleteProvider,
  fuzzyFilter,
} from '@earendil-works/pi-tui';

const VAULT_PATH = path.join(os.homedir(), 'murder');
const MAX_SUGGESTIONS = 20;

export interface VaultFile {
  absolutePath: string;
  relativePath: string;
}

/** Lists vault Markdown files while excluding Obsidian's internal directory. */
export async function listVaultMarkdownFiles(
  vaultPath: string
): Promise<VaultFile[]> {
  const resolvedVaultPath = await fs.realpath(vaultPath);
  const relativePaths = await Array.fromAsync(
    fs.glob('**/*.md', { cwd: resolvedVaultPath })
  );

  return relativePaths
    .map((relativePath) => ({
      absolutePath: path.join(resolvedVaultPath, relativePath),
      relativePath,
    }))
    .toSorted((left, right) =>
      left.relativePath.localeCompare(right.relativePath)
    );
}

function getReferenceBeforeCursor(textBeforeCursor: string) {
  const match = textBeforeCursor.match(/(?:^|[\t ])(#(?:"[^"]*|[^\s"]*))$/);
  if (!match) {
    return;
  }

  const prefix = match[1];
  const query = prefix.startsWith('#"') ? prefix.slice(2) : prefix.slice(1);
  return { prefix, query };
}

function formatCompletion(file: VaultFile): AutocompleteItem {
  const reference = file.relativePath.includes(' ')
    ? `#"${file.relativePath}"`
    : `#${file.relativePath}`;
  return {
    value: reference,
    label: reference,
    description: 'Obsidian vault',
  };
}

export function filterVaultFiles(files: VaultFile[], query: string) {
  const matches = query
    ? fuzzyFilter(files, query, (file) => file.relativePath)
    : files;
  return matches.slice(0, MAX_SUGGESTIONS).map(formatCompletion);
}

export function hasVaultReference(text: string) {
  return /(^|[\t \n])#(?:"[^"\n]+\.md"|[^\s"]+?\.md)(?=$|\s|[\p{P}\p{S}])/u.test(
    text
  );
}

/** Replaces valid vault references while leaving ordinary hashtags unchanged. */
export function expandVaultReferences(text: string, files: VaultFile[]) {
  const filesByRelativePath = new Map(
    files.map((file) => [file.relativePath, file.absolutePath])
  );

  return text.replaceAll(
    /(^|[\t \n])#(?:"([^"\n]+)"|([^\s"]+?\.md)([\p{P}\p{S}]*)(?=$|\s))/gu,
    (
      reference,
      boundary: string,
      quotedPath?: string,
      unquotedPath?: string,
      trailingPunctuation = ''
    ) => {
      const relativePath = quotedPath ?? unquotedPath;
      const absolutePath = relativePath
        ? filesByRelativePath.get(relativePath)
        : undefined;
      return absolutePath
        ? `${boundary}@${JSON.stringify(absolutePath)}${trailingPunctuation}`
        : reference;
    }
  );
}

export function createVaultAutocompleteProvider(
  current: AutocompleteProvider,
  getFiles: () => Promise<VaultFile[]>
): AutocompleteProvider {
  return {
    triggerCharacters: ['#'],
    async getSuggestions(lines, cursorLine, cursorCol, options) {
      const textBeforeCursor = (lines[cursorLine] ?? '').slice(0, cursorCol);
      const reference = getReferenceBeforeCursor(textBeforeCursor);
      if (!reference) {
        return current.getSuggestions(lines, cursorLine, cursorCol, options);
      }

      const files = await getFiles();
      if (options.signal.aborted) {
        return null;
      }

      const items = filterVaultFiles(files, reference.query);
      return items.length > 0
        ? { items, prefix: reference.prefix }
        : current.getSuggestions(lines, cursorLine, cursorCol, options);
    },
    applyCompletion(lines, cursorLine, cursorCol, item, prefix) {
      return current.applyCompletion(
        lines,
        cursorLine,
        cursorCol,
        item,
        prefix
      );
    },
    shouldTriggerFileCompletion(lines, cursorLine, cursorCol) {
      return (
        current.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ??
        true
      );
    },
  };
}

async function loadVaultFiles(ctx: ExtensionContext) {
  try {
    return await listVaultMarkdownFiles(VAULT_PATH);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.ui.notify(`Obsidian links: failed to index vault: ${message}`, 'error');
    return [];
  }
}

export default function registerObsidianLinks(pi: ExtensionAPI) {
  let getFiles: () => Promise<VaultFile[]>;

  pi.on('session_start', (_event, ctx) => {
    let filesPromise: Promise<VaultFile[]> | undefined;
    getFiles = () => {
      filesPromise ??= loadVaultFiles(ctx);
      return filesPromise;
    };

    if (ctx.mode === 'tui') {
      ctx.ui.addAutocompleteProvider((current) =>
        createVaultAutocompleteProvider(current, getFiles)
      );
    }
  });

  pi.on('input', async (event) => {
    if (!hasVaultReference(event.text)) {
      return { action: 'continue' };
    }

    const expandedText = expandVaultReferences(event.text, await getFiles());
    return expandedText === event.text
      ? { action: 'continue' }
      : { action: 'transform', text: expandedText };
  });
}
