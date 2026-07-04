import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { atomicWrite } from './atomicWrite.ts';
import { dirs, stripExtensions } from './files.ts';
import { prettyBytes } from './prettyBytes.ts';
import { log } from './theme.ts';

export const MAX_DIMENSION = 2048;
export const MAX_FILE_SIZE = 1024 * 1024;
export const MAX_SMALL_FILE_SIZE = MAX_FILE_SIZE * 0.5;
export const AVIF_QUALITY = 75;

export const IMAGE_WIKILINK_REGEX = /!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

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

/** Daily note basename from EXIF datetime: `2026-07-03_1537`. */
export function formatDailyNoteBasename(datetime: Date): string {
  const year = datetime.getFullYear();
  const month = String(datetime.getMonth() + 1).padStart(2, '0');
  const day = String(datetime.getDate()).padStart(2, '0');
  const hour = String(datetime.getHours()).padStart(2, '0');
  const minute = String(datetime.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}_${hour}${minute}`;
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

/** Return attachment filenames from Obsidian image wikilinks in a note body. */
export function getImageWikilinks(body: string): string[] {
  return [...body.matchAll(IMAGE_WIKILINK_REGEX)].map((match) => match[1]);
}

/** Remove Obsidian image wikilinks from a note body, keeping surrounding text. */
export function stripImageWikilinks(body: string): string {
  return body
    .replaceAll(/!\[\[[^\]|]+(?:\|[^\]]+)?\]\]\n*/g, '')
    .replaceAll(/\n\n\n+/gm, '\n\n')
    .trimEnd();
}

/** Split YAML frontmatter from Markdown body. Returns raw frontmatter text. */
export function parseFrontmatter(content: string): {
  frontmatter: string | undefined;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (match === null) {
    return { frontmatter: undefined, body: content };
  }
  return { frontmatter: match[1], body: match[2] };
}
