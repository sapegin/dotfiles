// Photo album index: EXIF cache, city/series slices, and gallery grouping helpers.

import fs from 'node:fs/promises';
import path from 'node:path';
import { readExifMetadata } from '../util/exif.ts';
import { atomicWrite, dirs, exts, glob } from '../util/files.ts';
import { IMPORT_DATE_PREFIX } from '../util/photos.ts';
import { toTitleCase } from '../util/text.ts';
import { type ImageKind } from './layout.js';

export type { ImageKind, KnownKind } from './layout.js';
export {
  createRows,
  getMaxColumns,
  LAYOUT_LARGE_MIN_WIDTH,
  LAYOUT_MOBILE_MAX_WIDTH,
} from './layout.js';

const PHOTO_ALBUM_INDEX_FILE = path.join(
  dirs.iCloudWebPhotos,
  '.photo-album-index.json'
);
// Not 6665–6669: Firefox blocks that IRC range as “restricted”.
export const PHOTO_ALBUM_PORT = 6767;

/** Raw cached fields for one source JPEG (album city is derived at read time). */
export interface PhotoAlbumRecord {
  filename: string;
  mtimeMs: number;
  captureDate: string;
  width: number;
  height: number;
  make: string;
  rating: number;
  keywords: string[];
  city?: string;
  state?: string;
  country?: string;
  title?: string;
}

export interface PhotoAlbumIndexFile {
  updatedAt: string;
  photos: PhotoAlbumRecord[];
}

export interface PhotoAlbumImage extends Omit<
  PhotoAlbumRecord,
  'mtimeMs' | 'captureDate'
> {
  captureDate: Date;
  albumCity?: string;
  series: string[];
  kind: ImageKind;
}

export interface CityAlbumRef {
  country: string;
  city: string;
  count: number;
}

/** Keywords that contain a hyphen are series names. */
export function isSeriesKeyword(keyword: string): boolean {
  return keyword.includes('-');
}

/**
 * Display title for a series keyword:
 *
 * - `cars-series` → `Cars`
 * - `1-0` / `butovo-1-0-series` → `1.0` / `Butovo 1.0`
 * - `berliner-fernsehturm` → `Berliner Fernsehturm`
 */
export function formatSeriesTitle(series: string): string {
  const withoutSuffix = series.endsWith('-series')
    ? series.slice(0, -'-series'.length)
    : series;

  // Bare or trailing `N-M` is a version: `1-0` / `butovo-1-0` → `1.0` / `Butovo 1.0`
  if (/^\d+-\d+$/.test(withoutSuffix)) {
    return withoutSuffix.replace('-', '.');
  }
  const versionMatch = withoutSuffix.match(/^(.+)-(\d+)-(\d+)$/);
  if (versionMatch !== null) {
    return `${toTitleCase(versionMatch[1])} ${versionMatch[2]}.${versionMatch[3]}`;
  }

  return toTitleCase(withoutSuffix);
}

/** Replace `{{name}}` placeholders; unknown keys are left unchanged. */
export function renderTemplate(
  template: string,
  values: Record<string, string>
): string {
  return template.replaceAll(/\{\{(\w+)\}\}/g, (match, key: string) => {
    if (Object.hasOwn(values, key)) {
      return values[key];
    }
    return match;
  });
}

/**
 * Album city is IPTC City, except when Province/State matches another photo's
 * City — then State wins (suburbs collapse into the parent city).
 */
export function resolveAlbumCity(
  city: string | undefined,
  state: string | undefined,
  knownCities: ReadonlySet<string>
): string | undefined {
  if (state !== undefined && state !== '' && knownCities.has(state)) {
    return state;
  }
  if (city !== undefined && city !== '') {
    return city;
  }
  return undefined;
}

/** Collect every non-empty IPTC City value in the library. */
export function collectKnownCities(
  photos: readonly Pick<PhotoAlbumRecord, 'city'>[]
): Set<string> {
  const cities = new Set<string>();
  for (const photo of photos) {
    if (photo.city !== undefined && photo.city !== '') {
      cities.add(photo.city);
    }
  }
  return cities;
}

/**
 * Layout kind for a photo:
 *
 * - `Scan_…` with rating below 5 → `fun`
 * - Otherwise square / portrait / landscape from aspect ratio
 */
export function getKind(
  filename: string,
  rating: number,
  width: number,
  height: number
): ImageKind {
  if (filename.startsWith('Scan_') && rating < 5) {
    return 'fun';
  }

  if (width === 0 || height === 0) {
    return 'unknown';
  }

  const ratio = width / height;

  // Near-square stays with squares; true portraits are clearly taller.
  if (ratio >= 0.95 && ratio <= 1.05) {
    return 'square';
  }

  if (ratio < 1) {
    return 'portrait';
  }

  return 'landscape';
}

export function recordToImage(
  record: PhotoAlbumRecord,
  knownCities: ReadonlySet<string>
): PhotoAlbumImage {
  const captureDate = new Date(record.captureDate);
  return {
    filename: record.filename,
    captureDate,
    width: record.width,
    height: record.height,
    make: record.make,
    rating: record.rating,
    keywords: record.keywords,
    city: record.city,
    state: record.state,
    country: record.country,
    title: record.title,
    albumCity: resolveAlbumCity(record.city, record.state, knownCities),
    series: record.keywords.filter(isSeriesKeyword),
    kind: getKind(record.filename, record.rating, record.width, record.height),
  };
}

export function recordsToImages(
  records: readonly PhotoAlbumRecord[]
): PhotoAlbumImage[] {
  const knownCities = collectKnownCities(records);
  return records
    .map((record) => recordToImage(record, knownCities))
    .toSorted((a, b) => a.captureDate.getTime() - b.captureDate.getTime());
}

export function filterByYear(
  images: readonly PhotoAlbumImage[],
  year: string
): PhotoAlbumImage[] {
  return images.filter(
    (image) => String(image.captureDate.getFullYear()) === year
  );
}

function albumCountry(country: string | undefined): string {
  return country === undefined || country === '' ? 'Unknown' : country;
}

export function filterByCity(
  images: readonly PhotoAlbumImage[],
  country: string,
  city: string
): PhotoAlbumImage[] {
  return images.filter(
    (image) =>
      albumCountry(image.country) === country && image.albumCity === city
  );
}

export function filterBySeries(
  images: readonly PhotoAlbumImage[],
  series: string
): PhotoAlbumImage[] {
  return images.filter((image) => image.series.includes(series));
}

/** Years newest-first with photo counts. */
export function listYears(
  images: readonly PhotoAlbumImage[]
): { year: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const image of images) {
    if (
      Number.isNaN(image.captureDate.getTime()) ||
      image.captureDate.getTime() === 0
    ) {
      continue;
    }
    const year = String(image.captureDate.getFullYear());
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([year, count]) => ({ year, count }))
    .toSorted((a, b) => Number(b.year) - Number(a.year));
}

/**
 * City albums grouped by country. Country falls back to "Unknown" when IPTC
 * Country is missing but a city was resolved.
 */
export function listCityAlbums(
  images: readonly PhotoAlbumImage[]
): { country: string; cities: CityAlbumRef[] }[] {
  const byCountry = new Map<string, Map<string, number>>();

  for (const image of images) {
    if (image.albumCity === undefined) {
      continue;
    }
    const country = albumCountry(image.country);
    const cities = byCountry.get(country) ?? new Map<string, number>();
    cities.set(image.albumCity, (cities.get(image.albumCity) ?? 0) + 1);
    byCountry.set(country, cities);
  }

  return [...byCountry.entries()]
    .map(([country, cities]) => ({
      country,
      cities: [...cities.entries()]
        .map(([city, count]) => ({ country, city, count }))
        .toSorted((a, b) => a.city.localeCompare(b.city)),
    }))
    .toSorted((a, b) => a.country.localeCompare(b.country));
}

/** Series names sorted alphabetically with counts. */
export function listSeries(
  images: readonly PhotoAlbumImage[]
): { series: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const image of images) {
    for (const series of image.series) {
      counts.set(series, (counts.get(series) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([series, count]) => ({ series, count }))
    .toSorted((a, b) => a.series.localeCompare(b.series));
}

function captureDateFromFilename(filename: string): Date | undefined {
  const fullDate = filename.match(IMPORT_DATE_PREFIX)?.[1];
  if (fullDate !== undefined) {
    return new Date(fullDate);
  }
  const monthOnlyMatch = filename.match(/(\d{4})-(\d{2})/);
  if (monthOnlyMatch !== null) {
    return new Date(`${monthOnlyMatch[1]}-${monthOnlyMatch[2]}-15`);
  }
  return undefined;
}

async function readPhotoRecord(
  sourceDir: string,
  filename: string,
  mtimeMs: number
): Promise<PhotoAlbumRecord | undefined> {
  const filePath = path.join(sourceDir, filename);
  try {
    const metadata = await readExifMetadata(filePath);
    const captureDate =
      metadata.datetime ?? captureDateFromFilename(filename) ?? new Date(0);

    return {
      filename,
      mtimeMs,
      captureDate: captureDate.toISOString(),
      width: metadata.imageWidth ?? 0,
      height: metadata.imageHeight ?? 0,
      make: metadata.make ?? '',
      rating: metadata.rating ?? 0,
      keywords: metadata.keywords ?? [],
      city: metadata.city,
      state: metadata.state,
      country: metadata.country,
      title: metadata.title,
    };
  } catch (error) {
    console.error(
      `Error reading EXIF from ${filePath}:`,
      error instanceof Error ? error.message : String(error)
    );
    return undefined;
  }
}

async function loadPhotoAlbumIndex(
  indexPath: string = PHOTO_ALBUM_INDEX_FILE
): Promise<PhotoAlbumIndexFile | undefined> {
  try {
    const raw = await fs.readFile(indexPath, 'utf8');
    const parsed = JSON.parse(raw) as {
      updatedAt?: string;
      photos?: PhotoAlbumRecord[];
    };
    if (
      typeof parsed.updatedAt !== 'string' ||
      Array.isArray(parsed.photos) === false
    ) {
      return undefined;
    }
    return {
      updatedAt: parsed.updatedAt,
      photos: parsed.photos,
    };
  } catch {
    return undefined;
  }
}

async function savePhotoAlbumIndex(
  index: PhotoAlbumIndexFile,
  indexPath: string = PHOTO_ALBUM_INDEX_FILE
): Promise<void> {
  const body = `${JSON.stringify(index, null, 2)}\n`;
  await atomicWrite(indexPath, async (tempFile) => {
    await fs.writeFile(tempFile, body);
  });
}

/**
 * Rebuild or incrementally update the JSON cache from JPEGs in `sourceDir`.
 * Reuses EXIF for files whose mtime is unchanged.
 */
export async function buildPhotoAlbumIndex(
  sourceDir: string = dirs.iCloudWebPhotos,
  indexPath: string = PHOTO_ALBUM_INDEX_FILE
): Promise<{ index: PhotoAlbumIndexFile; images: PhotoAlbumImage[] }> {
  const existing = await loadPhotoAlbumIndex(indexPath);
  const previousByName = new Map(
    (existing?.photos ?? []).map((photo) => [photo.filename, photo])
  );

  const filenames = await glob('*', exts.jpeg, { cwd: sourceDir });
  const photos: PhotoAlbumRecord[] = [];
  let readCount = 0;
  let reusedCount = 0;

  for (const filename of filenames) {
    const filePath = path.join(sourceDir, filename);
    try {
      const { mtimeMs } = await fs.stat(filePath);
      const previous = previousByName.get(filename);
      if (previous?.mtimeMs === mtimeMs) {
        photos.push(previous);
        reusedCount++;
        continue;
      }
      const record = await readPhotoRecord(sourceDir, filename, mtimeMs);
      if (record === undefined) {
        continue;
      }
      photos.push(record);
      readCount++;
      if (readCount % 25 === 0) {
        console.log(`  Read EXIF for ${readCount} new/changed photos…`);
      }
    } catch (error) {
      console.error(
        `Error indexing ${filePath}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  const index: PhotoAlbumIndexFile = {
    updatedAt: new Date().toISOString(),
    photos: photos.toSorted((a, b) => a.filename.localeCompare(b.filename)),
  };
  await savePhotoAlbumIndex(index, indexPath);
  console.log(
    `Index: ${photos.length} photos (${readCount} read, ${reusedCount} cached)`
  );

  return { index, images: recordsToImages(index.photos) };
}
