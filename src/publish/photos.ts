import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { readExifMetadata, type ExifMetadata } from '../util/exif.ts';
import { dirs, exts, glob } from '../util/files.ts';
import { getPhotoSlug } from '../util/photos.ts';
import { log } from '../util/tui.ts';

const AVIF_QUALITY = 80;
const AVIF_QUALITY_STEP = 10;
const AVIF_MIN_QUALITY = 40;
const MAX_FILE_SIZE = 500_000;
const THUMBNAIL_WIDTH = 752;

interface PhotoEntry {
  name: string;
  title: string;
  slug: string;
  caption?: string;
  modified: Date;
  timestamp?: Date;
  keywords: string[];
  rating: number;
  width: number;
  height: number;
  color: string;
}

async function readStoredPhoto(
  destDir: string,
  slug: string
): Promise<PhotoEntry | undefined> {
  const filepath = path.join(destDir, `${slug}.json`);
  try {
    const json = JSON.parse(
      await fs.readFile(filepath, 'utf8')
    ) as PhotoEntry & {
      modified: string;
      timestamp?: string;
    };
    return {
      ...json,
      modified: new Date(Date.parse(json.modified)),
      timestamp: json.timestamp
        ? new Date(Date.parse(json.timestamp))
        : undefined,
    };
  } catch {
    return undefined;
  }
}

async function getDominantColor(buffer: Buffer): Promise<string> {
  const { dominant } = await sharp(buffer).stats();
  const hex = [dominant.r, dominant.g, dominant.b]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('');
  return `#${hex}`;
}

async function writeAvif(
  pipeline: ReturnType<typeof sharp>,
  outputPath: string,
  quality: number
): Promise<void> {
  await pipeline.avif({ quality }).toFile(outputPath);
  const { size } = await fs.stat(outputPath);
  if (size > MAX_FILE_SIZE && quality - AVIF_QUALITY_STEP >= AVIF_MIN_QUALITY) {
    await writeAvif(pipeline, outputPath, quality - AVIF_QUALITY_STEP);
  }
}

async function convertToAvif(
  buffer: Buffer,
  publicPhotoDir: string,
  slug: string
): Promise<void> {
  await writeAvif(
    sharp(buffer),
    path.join(publicPhotoDir, `${slug}.avif`),
    AVIF_QUALITY
  );
  await writeAvif(
    sharp(buffer).resize({ width: THUMBNAIL_WIDTH }),
    path.join(publicPhotoDir, `${slug}_thumb.avif`),
    AVIF_QUALITY
  );
}

function buildPhotoEntry({
  name,
  slug,
  width,
  height,
  mtimeMs,
  color,
  metadata,
}: {
  name: string;
  slug: string;
  width: number;
  height: number;
  mtimeMs: number;
  color: string;
  metadata: ExifMetadata;
}): PhotoEntry {
  const timestamp = metadata.datetime;
  return {
    name,
    slug,
    color,
    width,
    height,
    modified: new Date(mtimeMs),
    timestamp,
    title: metadata.title ?? '',
    caption: metadata.caption ?? undefined,
    keywords: metadata.keywords ?? [],
    rating: metadata.rating ?? 0,
  };
}

/** Publish photos from the iCloud export folder to morning.photos. */
export async function publishPhotos(repoRoot: string): Promise<void> {
  const destDir = path.join(repoRoot, 'content/photos');
  const publicPhotoDir = path.join(
    repoRoot,
    'sites/morning.photos/public/photos'
  );

  console.log();
  console.log('[PHOTOS] Gathering photos…');

  await fs.mkdir(destDir, { recursive: true });
  await fs.mkdir(publicPhotoDir, { recursive: true });

  const photoFiles = await glob(dirs.iCloudWebPhotos, '*', exts.jpeg);

  console.log();
  console.log(`[PHOTOS] ${photoFiles.length} photos found`);

  console.log();
  console.log('[PHOTOS] Updating photos…');

  let count = 0;
  const publishedSlugs = new Set<string>();

  for (const filepath of photoFiles) {
    const { name } = path.parse(filepath);
    const slug = getPhotoSlug(name);
    if (slug === undefined) {
      log.warn(`Cannot determine slug for ${name}, skipping`);
      continue;
    }

    publishedSlugs.add(slug);

    const storedPhoto = await readStoredPhoto(destDir, slug);
    const { mtimeMs } = await fs.stat(filepath);

    if (storedPhoto && storedPhoto.modified.getTime() >= mtimeMs) {
      continue;
    }

    console.log(`👉 ${name}…`);

    let buffer: Buffer;
    try {
      buffer = await fs.readFile(filepath);
    } catch {
      log.error(`Cannot load photo ${filepath}, exiting…`);
      process.exit(1);
    }

    // Sharp types width/height as optional; every file in the export folder has both.
    const { width, height } = await sharp(buffer).metadata();

    const metadata = await readExifMetadata(filepath);
    const color = await getDominantColor(buffer);

    const photo = buildPhotoEntry({
      name,
      slug,
      mtimeMs,
      width,
      height,
      color,
      metadata,
    });

    await convertToAvif(buffer, publicPhotoDir, slug);

    await fs.writeFile(
      path.join(destDir, `${slug}.json`),
      JSON.stringify(photo, null, 2)
    );

    count++;
  }

  const destEntries = await fs.readdir(destDir);
  const existingJsonFiles = destEntries.filter((filename) =>
    filename.endsWith('.json')
  );

  let deleted = 0;

  for (const jsonFile of existingJsonFiles) {
    const slug = path.parse(jsonFile).name;
    if (publishedSlugs.has(slug)) {
      continue;
    }

    const jsonPath = path.join(destDir, jsonFile);
    const imagePath = path.join(publicPhotoDir, `${slug}.avif`);
    const thumbPath = path.join(publicPhotoDir, `${slug}_thumb.avif`);

    await fs.unlink(jsonPath);
    await fs.rm(imagePath, { force: true });
    await fs.rm(thumbPath, { force: true });

    console.log(`🗑️  Deleted ${slug}`);
    deleted++;
  }

  console.log();
  console.log(`[PHOTOS] ${count} photos updated, ${deleted} deleted`);
}
