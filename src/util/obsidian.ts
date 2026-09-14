import { execFileSync } from 'node:child_process';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import YAML from 'yaml';
import {
  dirs,
  prettyBytes,
  exts,
  hasExtension,
  stripExtensions,
  atomicWrite,
} from './files.ts';
import { formatLocalDateTime } from './time.ts';
import { log } from './tui.ts';

export const MAX_DIMENSION = 2048;
export const MAX_FILE_SIZE = 1024 * 1024;
export const MAX_SMALL_FILE_SIZE = MAX_FILE_SIZE * 0.5;
export const AVIF_QUALITY = 75;
const OBSIDIAN_VAULT_NAME = 'Murder';

// Matches Markdown images (`![Alt](photo.jpg)`) and Obsidian image wikilinks
// (`![[photo.jpg|400]]`). Capture groups: Markdown target is 2, Obsidian
// target is 3, and the optional Obsidian pipe is 4.
const MARKDOWN_IMAGE_REGEX =
  /!\[([^\]]*)\]\(([^)]+)\)|!\[\[([^\]|]+)(\|[^\]]+)?\]\]/g;

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface OptimizeResult {
  oldFilename: string;
  newFilename: string;
}

export interface OptimizeImageOptions {
  moveToTrash?: (filePath: string) => Promise<void>;
  onSkip?: (message: string) => void;
}

/** Exit the process when the Obsidian vault directory is missing. */
export async function assertObsidianVault(): Promise<void> {
  try {
    await fs.access(dirs.obsidianVault);
  } catch {
    log.error('\n✕ Error: Vault directory does not exist:', dirs.obsidianVault);
    process.exit(1);
  }
}

/** Open a vault-relative path in Obsidian. */
export function openObsidianPath(relativePath: string): void {
  const uri = `obsidian://open?vault=${encodeURIComponent(OBSIDIAN_VAULT_NAME)}&file=${encodeURIComponent(relativePath)}`;
  execFileSync('open', [uri]);
}

/**
 * Resolve a daily note file from its basename.
 *
 * - `2026-07-05_1021` → ~/murder/Log/2026/2026-07-05_1021.md
 */
export function getNotePath(noteBasename: string): string {
  const year = noteBasename.slice(0, 4);
  return path.join(dirs.obsidianDailyNotes, year, `${noteBasename}.md`);
}

/** Resolve a daily note file from a timestamp. */
export function getDailyNotePath(datetime: Date): string {
  return getNotePath(formatLocalDateTime(datetime));
}

/**
 * Return whether an attachment filename exists in the Obsidian attachments
 * folder.
 */
export async function doesAttachmentExist(filename: string): Promise<boolean> {
  try {
    await fs.access(path.join(dirs.obsidianAttachments, filename));
    return true;
  } catch {
    return false;
  }
}

/** Move a file to `~/.obsidian-trash`, suffixing duplicates as `name-1.ext`. */
export async function moveToTrash(filePath: string): Promise<void> {
  await fs.mkdir(dirs.obsidianTrash, { recursive: true });

  const filename = path.basename(filePath);
  let finalTrashPath = path.join(dirs.obsidianTrash, filename);
  let counter = 1;

  while (true) {
    try {
      await fs.access(finalTrashPath);
      const ext = path.extname(filename);
      const nameWithoutExt = path.basename(filename, ext);
      finalTrashPath = path.join(
        dirs.obsidianTrash,
        `${nameWithoutExt}-${counter}${ext}`
      );
      counter++;
    } catch {
      break;
    }
  }

  await fs.rename(filePath, finalTrashPath);
  console.log(`Move ${filename} to trash`);
}

/** Fit `width`×`height` inside `MAX_DIMENSION` without upscaling. */
export function getResizedDimensions(
  width: number,
  height: number
): ImageDimensions {
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    return { width, height };
  }

  if (width > height) {
    return {
      width: MAX_DIMENSION,
      height: Math.round(height * (MAX_DIMENSION / width)),
    };
  }

  return {
    width: Math.round(width * (MAX_DIMENSION / height)),
    height: MAX_DIMENSION,
  };
}

export async function getImageDimensions(
  imagePath: string,
  onError?: (message: string) => void
): Promise<ImageDimensions> {
  try {
    const metadata = await sharp(imagePath).metadata();
    return {
      width: typeof metadata.width === 'number' ? metadata.width : 0,
      height: typeof metadata.height === 'number' ? metadata.height : 0,
    };
  } catch (error) {
    onError?.(
      `Error reading image dimensions of ${path.basename(imagePath)}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return { width: 0, height: 0 };
  }
}

/**
 * Return target dimensions when a file should be converted to AVIF, otherwise
 * `undefined`. Large files always qualify; oversized dimensions qualify only
 * when the file is bigger than `MAX_SMALL_FILE_SIZE`.
 */
export async function needsOptimization(
  imagePath: string,
  onError?: (message: string) => void
): Promise<ImageDimensions | undefined> {
  const stats = await fs.stat(imagePath);
  const dimensions = await getImageDimensions(imagePath, onError);

  if (stats.size > MAX_FILE_SIZE) {
    return dimensions;
  }

  if (
    (dimensions.width > MAX_DIMENSION || dimensions.height > MAX_DIMENSION) &&
    stats.size > MAX_SMALL_FILE_SIZE
  ) {
    return dimensions;
  }

  return undefined;
}

/**
 * Resize and encode to AVIF when the result is smaller than the original.
 * Example: `2026_IMG_9488.jpeg` → `2026_IMG_9488.avif` (original moved to
 * trash).
 */
export async function optimizeImage(
  imagePath: string,
  optimization: ImageDimensions,
  options: OptimizeImageOptions = {}
): Promise<OptimizeResult | undefined> {
  const moveOriginalToTrash = options.moveToTrash ?? moveToTrash;
  const onSkip = options.onSkip ?? (() => {});

  const { width, height } = optimization;
  const filename = path.basename(imagePath);
  const dir = path.dirname(imagePath);
  const nameWithoutExt = stripExtensions(filename);
  const avifPath = path.join(dir, `${nameWithoutExt}.avif`);

  try {
    await fs.access(avifPath);
    onSkip(
      `Skipped image optimization of ${filename}: ${nameWithoutExt}.avif already exists`
    );
    return undefined;
  } catch {
    // No existing AVIF, proceed
  }

  const { width: newWidth, height: newHeight } = getResizedDimensions(
    width,
    height
  );

  let sharpInstance = sharp(imagePath);
  if (newWidth !== width || newHeight !== height) {
    sharpInstance = sharpInstance.resize(newWidth, newHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  await atomicWrite(avifPath, async (tempFile) => {
    await sharpInstance.avif({ quality: AVIF_QUALITY }).toFile(tempFile);
  });

  const originalStat = await fs.stat(imagePath);
  const optimizedStat = await fs.stat(avifPath);

  if (optimizedStat.size >= originalStat.size) {
    await fs.unlink(avifPath);
    console.log(
      `Skipped ${filename} (AVIF not smaller: ${prettyBytes(optimizedStat.size)} vs ${prettyBytes(originalStat.size)})`
    );
    return undefined;
  }

  const savedBytes = originalStat.size - optimizedStat.size;
  const savedPercentage = ((savedBytes / originalStat.size) * 100).toFixed(2);

  console.log(`${filename} → ${nameWithoutExt}.avif`);
  console.log(
    `  ↪ ${prettyBytes(originalStat.size)} → ${prettyBytes(optimizedStat.size)} (saved ${savedPercentage}%)`
  );

  if (newWidth !== width || newHeight !== height) {
    console.log(
      `  ↪ Resized from ${width}×${height} to ${newWidth}×${newHeight}`
    );
  }

  await moveOriginalToTrash(imagePath);

  return {
    oldFilename: filename.normalize('NFC'),
    newFilename: `${nameWithoutExt}.avif`.normalize('NFC'),
  };
}

/** Format a daily note heading: `# Sunday, July 3, 2026`. */
export function formatNoteHeading(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Normalize an image target to the filename stored in the vault. */
function getMarkdownImageFilename(target: string): string {
  if (
    target.startsWith('/') ||
    target.startsWith('https:') ||
    target.startsWith('http:')
  ) {
    return target;
  }

  return decodeURIComponent(path.basename(target)).normalize('NFC');
}

/**
 * Return attachment filenames from Markdown and Obsidian image syntax.
 *
 * Examples:
 *
 * - `![Alt](attachments/photo.jpg)` → `photo.jpg`
 * - `![[2026_IMG_9488.jpeg|400]]` → `2026_IMG_9488.jpeg`
 * - `![[Regular note]]` is ignored because it has no media extension.
 */
export function getMarkdownImages(body: string): string[] {
  return [...body.matchAll(MARKDOWN_IMAGE_REGEX)]
    .map((match) => getMarkdownImageFilename(match[2] || match[3]))
    .filter((filePath) => hasExtension(filePath, exts.media));
}

/** Replace plain or URL-encoded filename occurrences inside an image target. */
function replaceTargetFilename(
  target: string,
  oldFilename: string,
  newFilename: string
): string {
  const escapedOldFilename = RegExp.escape(oldFilename);
  const escapedOldFilenameEncoded = RegExp.escape(
    encodeURIComponent(oldFilename)
  );
  return target.replaceAll(
    new RegExp(`${escapedOldFilename}|${escapedOldFilenameEncoded}`, 'g'),
    newFilename
  );
}

/** Replace a filename in Markdown and Obsidian image syntax. */
export function replaceMarkdownImageReferences(
  body: string,
  oldFilename: string,
  newFilename: string
): string {
  return body.replaceAll(
    MARKDOWN_IMAGE_REGEX,
    (
      match,
      alt: string | undefined,
      markdownTarget: string | undefined,
      obsidianTarget: string | undefined,
      obsidianPipe: string | undefined
    ) => {
      const target = markdownTarget ?? obsidianTarget ?? '';
      if (getMarkdownImageFilename(target) !== oldFilename) {
        return match;
      }

      if (markdownTarget !== undefined) {
        return `![${alt}](${replaceTargetFilename(
          markdownTarget,
          oldFilename,
          newFilename
        )})`;
      }

      return `![[${newFilename}${obsidianPipe ?? ''}]]`;
    }
  );
}

/** Remove Obsidian image wikilinks from a note body, keeping surrounding text. */
export function stripImageWikilinks(body: string): string {
  return body
    .replaceAll(
      MARKDOWN_IMAGE_REGEX,
      (match, _alt: string | undefined, markdownTarget: string | undefined) =>
        markdownTarget === undefined ? '' : match
    )
    .replaceAll(/\n\n+/gm, '\n')
    .trimEnd();
}

/** Parsed YAML frontmatter for vault notes. */
export interface VaultFrontmatter {
  address?: string;
  aliases?: string[];
  author?: string;
  born?: string;
  cast?: string;
  coordinates?: string;
  created?: string;
  deadline?: string;
  description?: string;
  director?: string;
  image?: string;
  keywords?: string;
  location?: string;
  published?: string;
  rating?: string;
  refs?: string;
  slug?: string;
  source?: string;
  sputniks?: string;
  status?: string;
  tags?: string[];
  time?: string;
  'title-english'?: string;
  weather?: string;
  year?: string;
  yields?: string;
}

const STRING_ARRAY_FIELDS = ['aliases', 'tags'] as const;

function normalizeStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    const strings = value.filter(
      (item): item is string => typeof item === 'string'
    );
    return strings.length > 0 ? strings : undefined;
  }

  return undefined;
}

function normalizeFrontmatter<T extends object>(raw: unknown): T {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {} as T;
  }

  const record = { ...(raw as Record<string, unknown>) };

  for (const key of STRING_ARRAY_FIELDS) {
    if (key in record) {
      record[key] = normalizeStringArray(record[key]);
    }
  }

  return record as T;
}

/**
 * Split YAML frontmatter from Markdown body and parse it into an object.
 * Scalar YAML lists such as `tags` and `aliases` are coerced to `string[]`.
 */
export function parseFrontmatter<T extends object>(
  content: string
): {
  frontmatter: T;
  body: string;
  hasFrontmatter: boolean;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (match === null) {
    return { frontmatter: {} as T, body: content, hasFrontmatter: false };
  }

  return {
    frontmatter: normalizeFrontmatter<T>(YAML.parse(match[1]) ?? {}),
    body: match[2],
    hasFrontmatter: true,
  };
}

/** Matches wikilinks: [[target]] or [[target|label]] */
const WIKILINK_REGEXP = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/;

type FrontmatterValue = string | string[] | undefined;

/** Return true when srcPath is newer than destPath, or destPath does not exist. */
export function isNewer(srcPath: string, destPath: string): boolean {
  if (fsSync.existsSync(destPath) === false) {
    return true;
  }

  const srcMtime = fsSync.statSync(srcPath).mtimeMs;
  const destMtime = fsSync.statSync(destPath).mtimeMs;
  return srcMtime > destMtime;
}

export function extractTitle(content: string): string {
  const match = content.match(/^# (.+)$/m);
  return match ? match[1].trim() : '';
}

export function stripTitle(content: string): string {
  return content.replace(/^\s*# .+\n\n?/, '');
}

/** Drop private notes after the first horizontal rule (`---` or `***`). */
export function stripPrivateNotes(content: string): string {
  const lines = content.split('\n');
  const publicLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '---' || trimmed === '***') {
      break;
    }

    publicLines.push(line);
  }

  return publicLines.join('\n').trim();
}

export function getAllWikilinks(markdown: string): string[] {
  const matches = markdown.matchAll(new RegExp(WIKILINK_REGEXP.source, 'g'));
  return [...matches].map((match) => match[1]);
}

export function resolveWikilinks(
  text: string,
  slugMap: Map<string, string>,
  toUrl: (slug: string) => string
): string {
  return text.replaceAll(
    new RegExp(WIKILINK_REGEXP.source, 'g'),
    (_match, target: string, label?: string) => {
      const slug = slugMap.get(target);
      if (slug) {
        return `[${label ?? target}](${toUrl(slug)})`;
      }

      return label ?? target;
    }
  );
}

export function formatMarkdownImage(publicPath: string, alt?: string): string {
  if (alt === undefined || alt.length === 0) {
    return `![](${publicPath})`;
  }

  return `![${alt}](${publicPath})`;
}

export function parsePublishedDate(
  published: string | Date | undefined
): string | undefined {
  if (published instanceof Date) {
    return published.toISOString().slice(0, 10);
  }

  if (typeof published === 'string' && published.trim().length > 0) {
    return published;
  }

  return undefined;
}

export function formatPublishedDate(
  published: string | Date | undefined
): string {
  const date = parsePublishedDate(published);

  if (date === undefined) {
    throw new Error('Missing published date');
  }

  return date;
}

function formatYamlSingleQuotedString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function formatMarkdown(
  frontmatter: Record<string, FrontmatterValue>,
  body: string
): string {
  const lines = ['---'];

  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
      continue;
    }

    if (key === 'description') {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        continue;
      }

      lines.push(`description: ${formatYamlSingleQuotedString(trimmed)}`);
      continue;
    }

    if (key === 'title') {
      lines.push(`title: ${JSON.stringify(value)}`);
      continue;
    }

    lines.push(`${key}: ${value}`);
  }

  lines.push('---', '', body.trim(), '');

  return lines.join('\n');
}

export function hasTag(frontmatter: { tags?: unknown }, tag: string): boolean {
  return Array.isArray(frontmatter.tags) && frontmatter.tags.includes(tag);
}

export function readNoteFile<T extends object>(
  filePath: string,
  getSlug: (frontmatter: T, baseName: string) => string
) {
  const rawMarkdown = fsSync.readFileSync(filePath, 'utf8').trimStart();
  const { frontmatter, body } = parseFrontmatter<T>(rawMarkdown);
  const baseName = path.basename(filePath, '.md');
  const slug = getSlug(frontmatter, baseName);

  return { frontmatter, content: body, baseName, slug, filePath };
}

/** Split note body into `##` sections, dropping private notes from each section. */
export function parseSections(content: string): Map<string, string> {
  const sections = new Map<string, string>();
  const parts = content.split(/^## /m);

  for (let index = 1; index < parts.length; index++) {
    const newlineIndex = parts[index].indexOf('\n');
    if (newlineIndex !== -1) {
      const heading = parts[index].slice(0, newlineIndex).trim();
      const body = stripPrivateNotes(parts[index].slice(newlineIndex + 1));
      sections.set(heading, body);
    }
  }

  return sections;
}

/** Return the first image attachment referenced in Markdown or wikilink syntax. */
export function getFirstImageAttachment(content: string): string | undefined {
  return getMarkdownImages(content)[0];
}
