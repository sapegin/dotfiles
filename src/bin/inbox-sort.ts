// Sort top-level Inbox documents into ~/cloud/Documents with OCR + apfel.
//
// - Reads routing rules from ~/cloud/Documents/documents-sort.json
// - OCR via Docling, then classifies with Apple Intelligence (apfel)
// - Previews each move; prompts for filename and folder
// - Moves OCR markdown sidecar alongside the document
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  callApfel,
  extractDocument,
  isDoclingSupportedDocument,
} from '../util/ai.ts';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import {
  dirs,
  exts,
  getStem,
  moveFilePair,
  tildify,
  toFilename,
} from '../util/files.ts';
import { toSentenceCase } from '../util/text.ts';
import { log, promptEditable, run, select, theme } from '../util/tui.ts';

const OPTIONS = [] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

const CONFIG_PATH = path.join(dirs.iCloudDocuments, 'documents-sort.json');

const MAX_CLASSIFICATION_MARKDOWN_LENGTH = 5000;

const CLASSIFICATION_SCHEMA = {
  type: 'object',
  properties: {
    folder: { type: 'string' },
    title: { type: 'string' },
    date: { type: 'string' },
    name: { type: 'string' },
  },
  required: ['folder', 'title', 'date', 'name'],
  additionalProperties: false,
} as const;

export interface SortRule {
  readonly prompt: string;
  readonly folder: string;
  readonly archived?: boolean;
  readonly groupBy?: 'year';
}

export type DocumentsSortConfig = readonly SortRule[];

interface Classification {
  readonly folder: string;
  readonly title: string;
  readonly date: string;
  readonly name: string;
}

export interface SortSuggestion {
  readonly sourcePath: string;
  readonly folder: string;
  readonly title: string;
  readonly date: string;
  readonly name: string;
  readonly warnings: readonly string[];
}

function assertRecord(
  value: unknown,
  label: string
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function parseSortRule(value: unknown, label: string): SortRule {
  assertRecord(value, label);
  if (typeof value.prompt !== 'string' || value.prompt.length === 0) {
    throw new Error(`${label}.prompt must be a non-empty string`);
  }
  if (typeof value.folder !== 'string' || value.folder.length === 0) {
    throw new Error(`${label}.folder must be a non-empty string`);
  }
  if (value.archived !== undefined && typeof value.archived !== 'boolean') {
    throw new Error(`${label}.archived must be a boolean`);
  }
  if (value.groupBy !== undefined && value.groupBy !== 'year') {
    throw new Error(`${label}.groupBy must be "year"`);
  }
  return {
    prompt: value.prompt,
    folder: value.folder,
    ...(value.archived === true ? { archived: true } : {}),
    ...(value.groupBy === 'year' ? { groupBy: 'year' as const } : {}),
  };
}

/** Parse and validate `documents-sort.json` (a JSON array of routing rules). */
export function parseDocumentsSortConfig(value: unknown): DocumentsSortConfig {
  if (Array.isArray(value) === false || value.length === 0) {
    throw new Error('Config must be a non-empty array');
  }
  return value.map((item, index) => parseSortRule(item, `[${index}]`));
}

async function loadDocumentsSortConfig(
  configPath: string
): Promise<DocumentsSortConfig> {
  const raw = await fs.readFile(configPath, 'utf8');
  return parseDocumentsSortConfig(JSON.parse(raw));
}

function stripFolderSlashes(folder: string): string {
  return folder.replaceAll(/^\/+|\/+$/g, '');
}

/** Build destination folders the model may choose from. */
export function buildFolderAllowList(
  config: DocumentsSortConfig
): readonly string[] {
  return [...new Set(config.map((rule) => rule.folder))].toSorted();
}

export function isYearGroupedFolder(
  folder: string,
  config: DocumentsSortConfig
): boolean {
  const normalized = stripFolderSlashes(folder);
  for (const rule of config) {
    if (rule.groupBy !== 'year') {
      continue;
    }
    const base = rule.folder;
    if (normalized === base || normalized.startsWith(`${base}/`)) {
      return true;
    }
  }
  return false;
}

/** Check whether `folder` is allowed by config and naming rules. */
export function isAllowedFolder(
  folder: string,
  allowList: readonly string[],
  config: DocumentsSortConfig
): boolean {
  const normalized = stripFolderSlashes(folder);
  if (allowList.includes(normalized)) {
    return true;
  }
  return isYearGroupedFolder(normalized, config);
}

function formatRuleLine(rule: SortRule): string {
  const destination =
    rule.groupBy === 'year' ? `${rule.folder}/{YYYY}` : rule.folder;
  return `- ${rule.prompt} → ${destination}`;
}

/** System prompt for apfel with routing rules and allow-list. */
export function buildSystemPrompt(
  config: DocumentsSortConfig,
  allowList: readonly string[]
): string {
  const active = config.filter((rule) => rule.archived !== true);
  const archived = config.filter((rule) => rule.archived === true);

  return [
    'You classify personal documents for filing on macOS.',
    'Return JSON with folder, title, date, name.',
    '',
    'title — short English document type only (e.g. "Citizenship certificate", "Payslip"). No dates, no person names.',
    'date — document date when present: prefer YYYY-MM-DD, else YYYY-MM, else YYYY; empty string if unknown.',
    'name — first name of the document subject when not Artem Sapegin, otherwise empty string.',
    '',
    'Routing rules:',
    ...active.map(formatRuleLine),
    ...(archived.length === 0
      ? []
      : [
          '',
          'Archived (avoid unless clearly matching):',
          ...archived.map((rule) => `- ${rule.prompt} → ${rule.folder}`),
        ]),
    '',
    'Classify from document content only — filenames are generic scans.',
    '',
    'Allowed folders:',
    ...allowList.map((folder) => `- ${folder}`),
    ...config
      .filter((rule) => rule.groupBy === 'year')
      .map((rule) => `- ${rule.folder}/{YYYY}`),
  ].join('\n');
}

/** Extract YYYY from a date string for year-grouped folders. */
export function yearFromDate(date: string): string {
  const match = date.match(/^(\d{4})/);
  return match?.[1] ?? '';
}

function classifyDocument(
  markdown: string,
  systemPrompt: string
): Classification {
  const result = callApfel<Classification>({
    inputContent: markdown,
    systemPrompt,
    schema: CLASSIFICATION_SCHEMA,
    userPrompt: 'Classify this document.',
  });
  return {
    folder: stripFolderSlashes(result.folder.trim()),
    title: toSentenceCase(toFilename(result.title.trim())),
    date: result.date.trim(),
    name: result.name.trim(),
  };
}

function resolveFolder(
  folder: string,
  date: string,
  config: DocumentsSortConfig
): string {
  const year = yearFromDate(date);
  if (year.length === 0) {
    return folder;
  }
  for (const rule of config) {
    if (rule.groupBy !== 'year' || rule.folder !== folder) {
      continue;
    }
    if (folder.endsWith(`/${year}`)) {
      return folder;
    }
    return `${folder}/${year}`;
  }
  return folder;
}

export function buildDestinationPath(
  documentsDir: string,
  folder: string,
  title: string,
  extension: string
): string {
  const filename = `${toFilename(title)}${extension}`;
  return path.join(documentsDir, stripFolderSlashes(folder), filename);
}

/** Default manual title from the source filename (extension stripped). */
export function getOriginalFilenameTitle(sourcePath: string): string {
  const title = toFilename(getStem(sourcePath));
  return title.length === 0 ? 'Untitled' : title;
}

/** List folder paths under `documentsDir` relative to that root. */
export async function listExistingDocumentFolders(
  documentsDir: string
): Promise<string[]> {
  const folders: string[] = [];

  async function walk(relativeDir: string): Promise<void> {
    const absoluteDir = path.join(documentsDir, relativeDir);
    let entries;
    try {
      entries = await fs.readdir(absoluteDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory() === false || entry.name.startsWith('.')) {
        continue;
      }
      const relativePath =
        relativeDir === '' ? entry.name : `${relativeDir}/${entry.name}`;
      folders.push(relativePath);
      await walk(relativePath);
    }
  }

  await walk('');
  return folders.toSorted();
}

/** Folder choices for fzf: configured allow-list plus folders already on disk. */
export async function buildFolderOptions(
  documentsDir: string,
  allowList: readonly string[]
): Promise<string[]> {
  const existing = await listExistingDocumentFolders(documentsDir);
  return [...new Set([...allowList, ...existing])].toSorted();
}

/** List supported top-level files in Inbox; ignore subfolders and dotfiles. */
export async function listInboxFiles(inboxDir: string): Promise<string[]> {
  const entries = await fs.readdir(inboxDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isFile() === false || entry.name.startsWith('.')) {
      continue;
    }
    const filePath = path.join(inboxDir, entry.name);
    if (isDoclingSupportedDocument(filePath)) {
      files.push(filePath);
    }
  }

  return files.toSorted((a, b) => a.localeCompare(b));
}

/** OCR and classify; fall back to the original filename when unsure. */
export async function buildSortSuggestion(
  sourcePath: string,
  systemPrompt: string,
  allowList: readonly string[],
  config: DocumentsSortConfig
): Promise<SortSuggestion> {
  const originalTitle = getOriginalFilenameTitle(sourcePath);
  const warnings: string[] = [];

  let markdown: string;
  try {
    const ocr = await extractDocument(sourcePath);
    markdown = await fs.readFile(ocr.markdownPath, 'utf8');
    if (markdown.trim().length === 0) {
      warnings.push('Empty OCR text');
      return {
        sourcePath,
        folder: '',
        title: originalTitle,
        date: '',
        name: '',
        warnings,
      };
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    warnings.push(`OCR failed: ${detail}`);
    return {
      sourcePath,
      folder: '',
      title: originalTitle,
      date: '',
      name: '',
      warnings,
    };
  }

  const classificationMarkdown = markdown
    .trim()
    .slice(0, MAX_CLASSIFICATION_MARKDOWN_LENGTH);

  let classification: Classification;
  try {
    classification = classifyDocument(classificationMarkdown, systemPrompt);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    warnings.push(`Classification failed: ${detail}`);
    return {
      sourcePath,
      folder: '',
      title: originalTitle,
      date: '',
      name: '',
      warnings,
    };
  }

  const folder = resolveFolder(
    classification.folder,
    classification.date,
    config
  );

  if (
    folder.length > 0 &&
    isAllowedFolder(folder, allowList, config) === false
  ) {
    warnings.push(`Unknown folder "${folder}"`);
  }

  return {
    sourcePath,
    folder,
    title:
      classification.title.length === 0 ? originalTitle : classification.title,
    date: classification.date,
    name: classification.name,
    warnings,
  };
}

async function loadConfigOrExit() {
  try {
    return await loadDocumentsSortConfig(CONFIG_PATH);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      log.error(`Missing config: ${tildify(CONFIG_PATH)}`);
      process.exit(1);
    }

    log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function askFilename(defaultTitle: string): Promise<string | undefined> {
  const response = await promptEditable(
    `${theme.warning('?')} Filename (Enter to accept, Esc to skip): `,
    defaultTitle
  );
  if (response === undefined) {
    return undefined;
  }
  const answer = response.trim();
  const title = toFilename(answer.length === 0 ? defaultTitle : answer);
  return title.length === 0 ? undefined : title;
}

function printMetadata(proposal: SortSuggestion): void {
  if (proposal.name.length > 0) {
    console.log(`Name: ${proposal.name}`);
  }
  if (proposal.date.length > 0) {
    console.log(`Date: ${proposal.date}`);
  }
}

async function reviewFile(
  sourcePath: string,
  systemPrompt: string,
  allowList: readonly string[],
  config: DocumentsSortConfig
): Promise<'moved' | 'skipped' | 'failed'> {
  log.heading(`\n${path.basename(sourcePath)}…\n`);

  const proposal = await buildSortSuggestion(
    sourcePath,
    systemPrompt,
    allowList,
    config
  );

  for (const warning of proposal.warnings) {
    log.warn(warning);
  }

  printMetadata(proposal);

  const filenameDecision = await askFilename(proposal.title);
  if (filenameDecision === undefined) {
    return 'skipped';
  }

  const folderOptions = await buildFolderOptions(
    dirs.iCloudDocuments,
    allowList
  );
  const folderDecision = select(folderOptions, 'Folder', proposal.folder);
  if (folderDecision === undefined) {
    return 'skipped';
  }

  const destinationPath = buildDestinationPath(
    dirs.iCloudDocuments,
    folderDecision,
    filenameDecision,
    path.extname(sourcePath)
  );

  const moveResult = await moveFilePair(
    sourcePath,
    destinationPath,
    exts.markdown[0]
  );
  if (moveResult !== 'moved') {
    return moveResult;
  }

  console.log(`Moved to: ${tildify(destinationPath)}\n`);
  return 'moved';
}

export async function inboxSort(_options: Options): Promise<void> {
  const config = await loadConfigOrExit();
  const allowList = buildFolderAllowList(config);
  const systemPrompt = buildSystemPrompt(config, allowList);
  let inboxFiles: string[];
  try {
    inboxFiles = await listInboxFiles(dirs.iCloudInbox);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      log.error(`Missing inbox: ${tildify(dirs.iCloudInbox)}`);
      process.exit(1);
    }
    throw error;
  }

  if (inboxFiles.length === 0) {
    log.warn(`No supported files in ${tildify(dirs.iCloudInbox)}`);
    return;
  }

  let moved = 0;
  let skipped = 0;
  let failed = 0;

  for (const sourcePath of inboxFiles) {
    const result = await reviewFile(
      sourcePath,
      systemPrompt,
      allowList,
      config
    );
    if (result === 'moved') {
      moved++;
    } else if (result === 'failed') {
      failed++;
    } else {
      skipped++;
    }
  }

  console.log(`${moved} moved, ${skipped} skipped, ${failed} failed`);
}

await run(import.meta.url, () => inboxSort(parseArgs(OPTIONS)));
