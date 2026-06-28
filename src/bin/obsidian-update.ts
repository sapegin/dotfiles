// Optimizes Obsidian vault:
// * Back up vault
// * Downscales and compress images
// * Removes unused images
// * Updates frontmatters
// * Removes images from Obsidian trash
// * Lint notes
// * etc.
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import sharp from 'sharp';
import YAML from 'yaml';
import { atomicWrite } from '../util/atomicWrite.ts';
import { dirs, IMAGE_EXTENSIONS } from '../util/consts.ts';
import { readExifMetadata } from '../util/exiftool.ts';
import { prettyBytes } from '../util/prettyBytes.ts';
import { run } from '../util/run.ts';
import { log } from '../util/theme.ts';

// TC39 stage 4, shipped in Node 24, not yet in TypeScript's lib.esnext.
declare global {
  interface RegExpConstructor {
    escape(str: string): string;
  }
}

const ATTACHMENTS_DIR = path.join(dirs.obsidianVault, 'zz-attachments');
const TRASH_DIR = path.join(dirs.home, '.obsidian-trash');
const BACKUP_DIR = path.join(dirs.home, '.obsidian-backup');
const OBSIDIAN_TRASH_DIR = path.join(dirs.obsidianVault, '.trash');

const MAX_DIMENSION = 2048;
const MAX_FILE_SIZE = 1024 * 1024; // 1 MB
const MAX_LARGE_FILE_SIZE = MAX_FILE_SIZE * 0.5; // 0.5 MB
const AVIF_QUALITY = 75;
const ALL_IMAGE_EXTENSIONS = [...IMAGE_EXTENSIONS, '.avif'];
const ALL_EXTENSIONS = [...ALL_IMAGE_EXTENSIONS, '.md'];
const ALL_IMAGES_PATTERN = `**/*.{${ALL_IMAGE_EXTENSIONS.map((ext) => ext.slice(1)).join(',')}}`;

const ALL_NOTES_PATTERN = `**/*.md`;

const FRONTMATTER_FIELDS = [
  'address',
  'aliases',
  'author',
  'born',
  'cast',
  'coordinates',
  'created',
  'deadline',
  'description',
  'director',
  'image',
  'keywords',
  'location',
  'published',
  'rating',
  'refs',
  'slug',
  'source',
  'sputniks',
  'status',
  'tags',
  'time',
  'title-english',
  'weather',
  'year',
  'yields',
];

// Either regular Markdown images (![Alt text](image.ext)`), or Obsidian images
// with optional resizing pipe (`![[image.png|100]]`)
const imageRegex = /!\[.*?\]\(([^)]+)\)|!\[\[([^\]]+)\]\]/g;

// WMO Weather interpretation codes
const WMO_WEATHER_CODES: Record<number, string> = {
  0: 'sunny',
  1: 'mainly sunny',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'fog',
  48: 'depositing rime fog',
  51: 'light drizzle',
  53: 'moderate drizzle',
  55: 'dense drizzle',
  56: 'light freezing drizzle',
  57: 'dense freezing drizzle',
  61: 'slight rain',
  63: 'moderate rain',
  65: 'heavy rain',
  66: 'light freezing rain',
  67: 'heavy freezing rain',
  71: 'slight snow',
  73: 'moderate snow',
  75: 'fucking lots of snow',
  77: 'snow grains',
  80: 'slight rain showers',
  81: 'moderate rain showers',
  82: 'violent rain showers',
  85: 'slight snow showers',
  86: 'heavy snow showers',
  95: 'thunderstorm',
  96: 'thunderstorm with slight hail',
  99: 'thunderstorm with heavy hail',
};
const WMO_WEATHER_CODES_NIGHT: Record<number, string> = {
  0: 'clear',
  1: 'mainly clear',
};

interface Frontmatter {
  image?: string;
  location?: string;
  coordinates?: string;
  weather?: string;
  tags?: string[];
  description?: string;
  [key: string]: unknown;
}

interface ImageDimensions {
  width: number;
  height: number;
}

interface ImageMetadata {
  date: string;
  coordinates: string | undefined;
}

interface OptimizeResult {
  oldFilename: string;
  newFilename: string;
}

interface WeatherResponse {
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    is_day: number[];
  };
}

const warnings: string[] = [];

function printWarning(...args: unknown[]): void {
  const message = args
    .map((arg) => (typeof arg === 'string' ? arg : String(arg)))
    .join(' ');
  warnings.push(message);
  log.warn(`\n ${message}\n`);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getErrorStack(error: unknown): string {
  return error instanceof Error
    ? (error.stack ?? error.message)
    : String(error);
}

/** Parse datetime from basename (format: YYYY-MM-DD_HHmm). */
function parseNoteDate(basename: string): Date | undefined {
  const datetimeMatch = basename.match(/^(\d{4}-\d{2}-\d{2})_(\d{2})(\d{2})$/);
  if (datetimeMatch) {
    const [, date, hour, minute] = datetimeMatch;
    return new Date(Date.parse(`${date}T${hour}:${minute}:00`));
  } else {
    printWarning(`${basename}: Cannot parse date`);
  }
  return undefined;
}

/** Strip known extension (image file or Markdown) from a file path. */
function stripExtension(filePath: string): string {
  let newFilePath = filePath;
  for (const ext of ALL_EXTENSIONS) {
    if (newFilePath.toLowerCase().endsWith(ext)) {
      newFilePath = newFilePath.slice(0, -ext.length);
    }
  }
  return newFilePath;
}

/** File basename that supports multiple (known) extensions. */
function getBasename(filePath: string): string {
  const filename = path.basename(filePath);
  return stripExtension(stripExtension(filename));
}

/** Unwrap an Obsidian wikilink (`[[target|alias]]`) to its target. */
function unwrapWikilink(value: unknown): string {
  if (typeof value !== 'string') {
    return String(value);
  }
  const match = value.match(/^\[\[(.+)\]\]$/);
  if (match === null) {
    return value;
  }
  return match[1].split('|')[0];
}

async function moveToTrash(filePath: string): Promise<void> {
  const filename = path.basename(filePath);
  const trashPath = path.join(TRASH_DIR, filename);

  // Handle duplicate filenames in trash
  let finalTrashPath = trashPath;
  let counter = 1;
  while (true) {
    try {
      await fs.access(finalTrashPath);
      const ext = path.extname(filename);
      const nameWithoutExt = path.basename(filename, ext);
      finalTrashPath = path.join(
        TRASH_DIR,
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

/** Return all images in Markdown */
function getMarkdownImages(body: string): string[] {
  const matches = [...body.matchAll(imageRegex)];
  return matches
    .map((match) => {
      const filePath = match[1] || match[2];

      // Return absolute paths as is
      if (
        filePath.startsWith('/') ||
        filePath.startsWith('https:') ||
        filePath.startsWith('http:')
      ) {
        return filePath;
      }

      // Extract just the filename, remove Obsidian's resizing pipe
      // (`image.png|100`), and decode URL encoding
      const cleanFilePath = filePath.split('|')[0];
      return decodeURIComponent(path.basename(cleanFilePath)).normalize('NFC');
    })
    .filter((filePath) => {
      // Skip embedded notes (`![[Note name]]`) which have no image extension
      const ext = path.extname(filePath).toLowerCase();
      return ALL_IMAGE_EXTENSIONS.includes(ext);
    });
}

/** Return basename of the given image in Markdown. */
function getImageByIndex(body: string, index: number): string | undefined {
  const images = getMarkdownImages(body);
  return images.length > 0 ? path.basename(images[index]) : undefined;
}

/** Fetch weather data from Open-Meteo API. */
async function getWeather(
  lat: string,
  lon: string,
  date: Date
): Promise<string | undefined> {
  const isoDateString = date.toISOString();
  const dateString = isoDateString.slice(0, 10); // YYYY-MM-DD
  const hourString = isoDateString.slice(11, 13); // HH

  // Determine if we need historical or current API
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const isHistorical = date < threeMonthsAgo;
  const baseUrl = isHistorical
    ? 'https://archive-api.open-meteo.com/v1/archive'
    : 'https://api.open-meteo.com/v1/forecast';

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    start_date: dateString,
    end_date: dateString,
    hourly: 'temperature_2m,weather_code,is_day',
    timezone: 'auto',
  });

  const response = await fetch(`${baseUrl}?${params.toString()}`);
  if (response.ok === false) {
    return undefined;
  }

  const data = (await response.json()) as WeatherResponse;

  // Find the closest hour
  const hourIndex = data.hourly.time.findIndex((time) =>
    time.startsWith(`${dateString}T${hourString}`)
  );

  if (hourIndex === -1) {
    return undefined;
  }

  const temperature = Math.round(data.hourly.temperature_2m[hourIndex]);
  const weatherCode = data.hourly.weather_code[hourIndex];
  const isDay = data.hourly.is_day[hourIndex];

  let condition = WMO_WEATHER_CODES[weatherCode];
  if (isDay === 0 && WMO_WEATHER_CODES_NIGHT[weatherCode]) {
    condition = WMO_WEATHER_CODES_NIGHT[weatherCode];
  }

  const weather = condition
    ? `${temperature}°C, ${condition}`
    : `${temperature}°C`;

  console.log(`  ↪ ${weather}`);

  return weather;
}

/** Read EXIF photo metadata. */
async function getImageMetadata(
  filename: string | undefined
): Promise<ImageMetadata> {
  if (!filename) {
    console.log(`No filename, skipping`);
    return { date: '', coordinates: undefined };
  }

  let filePath = path.join(ATTACHMENTS_DIR, filename);
  const ext = path.extname(filename).toLowerCase();

  // If the image isn't JPEG, look for the original JPEG file in the trash
  if (ext !== '.jpg' && ext !== '.jpeg') {
    const nameWithoutExt = path.basename(filename, ext);
    const jpegFiles = await Array.fromAsync(
      fs.glob(path.join(TRASH_DIR, `${nameWithoutExt}.{jpg,jpeg,JPG,JPEG}`))
    );
    if (jpegFiles.length > 0) {
      filePath = jpegFiles[0];
    } else {
      // Can't do anything, only JPEG files have metadata
      console.log(`Not JPEG, skipping (${filename})`);
      return { date: '', coordinates: undefined };
    }
  }

  // Check if file exists
  try {
    await fs.access(filePath);
  } catch {
    console.log(`File doesn't exist, skipping (${filename})`);
    return { date: '', coordinates: undefined };
  }

  const { dateTimeOriginal, gpsLatitude, gpsLongitude } =
    await readExifMetadata(filePath);
  const date = dateTimeOriginal ?? '';

  let coordinates: string | undefined;
  if (gpsLatitude !== undefined && gpsLongitude !== undefined) {
    coordinates = `${gpsLatitude.toFixed(10)}, ${gpsLongitude.toFixed(10)}`;
  }

  return { date, coordinates };
}

async function findUsedImages(markdownFiles: string[]): Promise<Set<string>> {
  const usedImages = new Set<string>();

  for (const file of markdownFiles) {
    const content = await fs.readFile(file, 'utf8');
    for (const image of getMarkdownImages(content)) {
      usedImages.add(image);
    }
  }

  return usedImages;
}

async function removeUnusedImages(
  imageFiles: string[],
  usedImages: Set<string>
): Promise<void> {
  let removedCount = 0;

  for (const imagePath of imageFiles) {
    const filename = path.basename(imagePath).normalize('NFC');

    if (usedImages.has(filename) === false) {
      await moveToTrash(imagePath);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    console.log(`\nRemoved ${removedCount} unused images`);
  }
}

async function getImageDimensions(imagePath: string): Promise<ImageDimensions> {
  try {
    const metadata = await sharp(imagePath).metadata();
    const width = typeof metadata.width === 'number' ? metadata.width : 0;
    const height = typeof metadata.height === 'number' ? metadata.height : 0;
    return { width, height };
  } catch (error) {
    printWarning(
      `Error reading image dimensions of ${getBasename(imagePath)}:\n`,
      getErrorStack(error)
    );
    return { width: 0, height: 0 };
  }
}

async function needsOptimization(
  imagePath: string
): Promise<ImageDimensions | undefined> {
  const stats = await fs.stat(imagePath);
  const dimensions = await getImageDimensions(imagePath);

  // File size is too large
  if (stats.size > MAX_FILE_SIZE) {
    return dimensions;
  }

  if (
    // Image dimensions exceed allowed
    (dimensions.width > MAX_DIMENSION || dimensions.height > MAX_DIMENSION) &&
    // But skip small sizes where optimizations is unlikely to produce smaller file
    stats.size > MAX_LARGE_FILE_SIZE
  ) {
    return dimensions;
  }

  // File doesn't need optimization
  return undefined;
}

async function optimizeImage(
  imagePath: string,
  optimization: ImageDimensions
): Promise<OptimizeResult | undefined> {
  const { width, height } = optimization;
  const filename = path.basename(imagePath);
  const dir = path.dirname(imagePath);

  // Strip all image extensions to avoid conflicts (e.g., file.jpg.webp → file)
  let nameWithoutExt = filename;
  for (const ext of ALL_IMAGE_EXTENSIONS) {
    if (nameWithoutExt.toLowerCase().endsWith(ext)) {
      nameWithoutExt = nameWithoutExt.slice(0, -ext.length);
    }
  }

  const avifPath = path.join(dir, `${nameWithoutExt}.avif`);

  // Refuse to overwrite an existing AVIF; leave the original alone
  try {
    await fs.access(avifPath);
    printWarning(
      `Skipped image optimization of ${filename}: ${nameWithoutExt}.avif already exists`
    );
    return undefined;
  } catch {
    // No existing AVIF, proceed
  }

  // Calculate new dimensions if needed
  let newWidth = width;
  let newHeight = height;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width > height) {
      newWidth = MAX_DIMENSION;
      newHeight = Math.round(height * (MAX_DIMENSION / width));
    } else {
      newHeight = MAX_DIMENSION;
      newWidth = Math.round(width * (MAX_DIMENSION / height));
    }
  }

  // Convert and optimize
  let sharpInstance = sharp(imagePath);

  if (newWidth !== width || newHeight !== height) {
    sharpInstance = sharpInstance.resize(newWidth, newHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // Encode AVIF into a temp file, then atomically rename onto the
  // iCloud-watched destination — sharp's streaming writer would otherwise
  // expose a partially-written file to the iCloud daemon.
  await atomicWrite(avifPath, async (tempFile) => {
    await sharpInstance.avif({ quality: AVIF_QUALITY }).toFile(tempFile);
  });

  const originalStat = await fs.stat(imagePath);
  const optimizedStat = await fs.stat(avifPath);
  const originalSize = originalStat.size;
  const optimizedSize = optimizedStat.size;

  // Only keep the optimized version if it's smaller
  if (optimizedSize >= originalSize) {
    await fs.unlink(avifPath);
    console.log(
      `Skipped ${filename} (AVIF not smaller: ${prettyBytes(optimizedSize)} vs ${prettyBytes(originalSize)})`
    );
    return undefined;
  }

  const savedBytes = originalSize - optimizedSize;
  const savedPercentage = ((savedBytes / originalSize) * 100).toFixed(2);

  console.log();
  console.log(`${filename} → ${nameWithoutExt}.avif`);
  console.log(
    `  ↪ ${prettyBytes(originalSize)} → ${prettyBytes(optimizedSize)} (saved ${savedPercentage}%)`
  );

  if (newWidth !== width || newHeight !== height) {
    console.log(
      `  ↪ Resized from ${width}×${height} to ${newWidth}×${newHeight}`
    );
  }

  // Move original to trash
  await moveToTrash(imagePath);

  return {
    oldFilename: filename.normalize('NFC'),
    newFilename: `${nameWithoutExt}.avif`.normalize('NFC'),
  };
}

async function optimizeImages(
  imageFiles: string[]
): Promise<Map<string, string>> {
  const renamedFiles = new Map<string, string>();

  for (const imagePath of imageFiles) {
    const ext = path.extname(imagePath).toLowerCase();

    // Skip AVIF as already optimized, and HEIC/MOV as Sharp doesn't support them
    if (ext === '.avif' || ext === '.heic' || ext === '.mov') {
      continue;
    }

    const optimization = await needsOptimization(imagePath);

    if (optimization) {
      const result = await optimizeImage(imagePath, optimization);
      if (result) {
        const { oldFilename, newFilename } = result;
        renamedFiles.set(oldFilename, newFilename);
      }
    }
  }

  if (renamedFiles.size > 0) {
    console.log(`\nOptimized ${renamedFiles.size} images`);
  }
  return renamedFiles;
}

function parseFrontmatter(content: string): {
  frontmatter: Frontmatter;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterText = match[1];
  const body = match[2];
  const frontmatter = (YAML.parse(frontmatterText) ?? {}) as Frontmatter;

  return { frontmatter, body };
}

function serializeFrontmatter(frontmatter: Frontmatter): string {
  // Remove empty (undefined, null, '') values, and sort fields
  const cleanFrontmatter: Frontmatter = Object.fromEntries(
    Object.entries(frontmatter)
      .filter(
        ([, value]) => value !== undefined && value !== null && value !== ''
      )
      .toSorted(
        ([keyA], [keyB]) =>
          FRONTMATTER_FIELDS.indexOf(keyA) - FRONTMATTER_FIELDS.indexOf(keyB)
      )
  );

  // Sort tags alphabetically
  if (cleanFrontmatter.tags) {
    cleanFrontmatter.tags = cleanFrontmatter.tags.toSorted((a, b) =>
      a.localeCompare(b)
    );
  }

  const yamlContent = YAML.stringify(cleanFrontmatter, undefined, {
    // Don't wrap long lines
    lineWidth: 0,
  });
  return `---\n${yamlContent.trim()}\n---`;
}

function getExcerpt(body: string): string {
  const textOnly = body
    // Remove headings
    .replaceAll(/^#.*/gm, '')
    // Remove images
    .replaceAll(/!\[.*?\]\([^)]+\)/g, '')
    .replaceAll(/!\[\[.*?\]\]/g, '')
    // Remove links
    .replaceAll(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replaceAll(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1')
    .replaceAll(/\[\[([^\]]+)\]\]/g, '$1')
    .replaceAll(/https?:\/\/.*/g, '')
    // Remove code snippets
    .replaceAll(/```[\S\s]*?```/gm, '')
    // Remove markup
    .replaceAll(/[*_>~`]/g, '')
    // Join lines
    .replaceAll(/\n/gm, ' ')
    // Clean up
    .replaceAll(/\s+/g, ' ')
    .trim();

  // Leave only very short snippet of text to avoid excerpts appearing in search
  // results too often
  const match = textOnly.match(/.{80}[^ ]*/);
  return match ? `${match[0].replace(/[.,!?…()]$/, '')}…` : textOnly;
}

interface UpdateNoteArgs {
  frontmatter: Frontmatter;
  body: string;
  file: string;
  allNotes: string[];
  renamedFiles: Map<string, string>;
  attachmentNames: Set<string>;
}

interface UpdateNoteResult {
  newFrontmatter: Frontmatter;
  newBody: string;
  newFile: string;
}

async function updateNote({
  frontmatter,
  body,
  file,
  allNotes,
  renamedFiles,
  attachmentNames,
}: UpdateNoteArgs): Promise<UpdateNoteResult> {
  const newFrontmatter: Frontmatter = { ...frontmatter };
  let newBody = body;
  let newFile = file;

  const basename = path.basename(file, '.md');

  // Update renamed image links
  const images = getMarkdownImages(body);
  for (const image of images) {
    // Update renamed images
    const newFilename = renamedFiles.get(image);
    if (newFilename !== undefined) {
      console.log(`Updating image links: ${path.basename(newFilename)}`);

      const escapedOldFilename = RegExp.escape(image);
      const escapedOldFilenameEncoded = RegExp.escape(
        encodeURIComponent(image)
      );

      // Simplified regexp to cath Markdown images (![Alt text](image.ext)`) and
      // Obsidian images with optional resizing pipe (`![[image.png|100]]`)
      const regex = new RegExp(
        `([([])(${escapedOldFilename}|${escapedOldFilenameEncoded})([)\\]|])`,
        'g'
      );
      // Update the image name in the link
      newBody = newBody.replace(regex, (_match, prefix, _image, suffix) => {
        return `${prefix}${newFilename}${suffix}`;
      });
    }
  }

  // Check for missing images
  const updatedImages = getMarkdownImages(newBody);
  for (const image of updatedImages) {
    if (
      // Skip Obsidian Bases
      image.endsWith('.base') === false &&
      image.includes('.base#') === false &&
      // Skip embedded notes (they don't have a file extension)
      image.includes('.') === true &&
      attachmentNames.has(image) === false
    ) {
      const suggestions: string[] = [];
      const imageBasename = stripExtension(image);
      if (imageBasename !== '') {
        // Suggest attachments whose name contains the missing file’s base name
        for (const name of attachmentNames) {
          if (stripExtension(name).includes(imageBasename)) {
            suggestions.push(name);
          }
        }
      }
      printWarning(
        `${basename}: Missing image ${image}\n   ↪ Did you mean ${suggestions.join(', ')}?`
      );
    }
  }

  // Check if the cover image exists
  if (newFrontmatter.image) {
    // Unwrap Obsidian wikilink format (`[[image.jpg]]`) written by Web Clipper
    newFrontmatter.image = path.basename(unwrapWikilink(newFrontmatter.image));

    const coverImageFilePath = path.join(ATTACHMENTS_DIR, newFrontmatter.image);
    try {
      await fs.access(coverImageFilePath);
    } catch {
      console.log(
        `Cover image doesn’t exist (${path.basename(coverImageFilePath)}), updating…`
      );
      newFrontmatter.image = undefined;
    }
  }

  const firstImage = getImageByIndex(newBody, 0);
  // Set `image` field to the first image of the note
  if (firstImage && newFrontmatter.image === undefined) {
    newFrontmatter.image = firstImage;
  }

  // Detect misspelled note properties
  for (const field in newFrontmatter) {
    if (FRONTMATTER_FIELDS.includes(field) === false) {
      printWarning(`${basename}: Invalid property name “${field}”`);
    }
  }

  // Journal notes
  if (file.includes('Log/')) {
    // Detect incorrect log folder (e.g. 2026/2004-01-03_1134.md)
    const folderMatch = file.match(/Log\/(\d{4})\//);
    const dateMatch = basename.match(/^(\d{4})-/);
    if (folderMatch && dateMatch && folderMatch[1] !== dateMatch[1]) {
      console.log(
        `Wrong folder: ${basename} is in ${folderMatch[1]}/ but should be in ${dateMatch[1]}/`
      );
      newFile = newFile.replace(
        `Log/${folderMatch[1]}/`,
        `Log/${dateMatch[1]}/`
      );
    }

    // Set description
    newFrontmatter.description = getExcerpt(body);

    const { location } = frontmatter;

    // Update location field
    if (typeof location === 'string' && location.startsWith('[[') === false) {
      // Link notes about places if they exist in the vault
      const locationNote = allNotes.find(
        (notePath) =>
          path.basename(notePath, '.md').normalize('NFC') ===
          location.normalize('NFC')
      );
      if (locationNote) {
        newFrontmatter.location = `[[${location}]]`;
      }
    }

    // Get the coordinates from linked location note
    if (typeof location === 'string') {
      const locationName = unwrapWikilink(location);

      const locationNotePath = allNotes.find(
        (notePath) =>
          path.basename(notePath, '.md').normalize('NFC') ===
          locationName.normalize('NFC')
      );

      if (locationNotePath) {
        try {
          const locationContent = await fs.readFile(locationNotePath, 'utf8');
          const { frontmatter: locationFrontmatter } =
            parseFrontmatter(locationContent);
          if (locationFrontmatter.coordinates) {
            newFrontmatter.coordinates = locationFrontmatter.coordinates;
          }
        } catch {
          // Ignore errors reading location note
        }
      }
    }

    // Set coordinates based on the fist image
    if (firstImage && newFrontmatter.coordinates === undefined) {
      const firstImageMetadata = await getImageMetadata(firstImage);

      if (firstImageMetadata.coordinates) {
        newFrontmatter.coordinates = firstImageMetadata.coordinates;
      }
    }

    // Get the date/time from the filename
    const date = parseNoteDate(path.basename(newFile, '.md'));

    // Check for missing coordinates
    if (location && newFrontmatter.coordinates === undefined) {
      printWarning(`${basename}: Missing coordinates for ${location}`);
    }

    // Fetch weather if we have coordinates and no weather field yet
    if (
      date &&
      newFrontmatter.weather === undefined &&
      newFrontmatter.coordinates
    ) {
      console.log(`Fetching weather for ${getBasename(newFile)}…`);

      // Parse coordinates
      const [lat, lon] = newFrontmatter.coordinates
        .split(',')
        .map((c) => c.trim());

      try {
        const weather = await getWeather(lat, lon, date);
        if (weather) {
          newFrontmatter.weather = weather;
        }
      } catch (error) {
        printWarning(
          `${basename}: Cannot fetch weather for ${lat}, ${lon}, ${date.toISOString()}:`,
          getErrorMessage(error)
        );
      }

      // Small delay to avoid hitting rate limits
      await setTimeout(100);
    }

    // Update top-level headers
    const newDate = date
      ? date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : basename;

    if (newBody.trim().startsWith('# ') === false) {
      newBody = `# ${newDate}\n${newBody}`;
    } else {
      newBody = newBody.replace(/^#.*\n/, `# ${newDate}\n`);
    }
  } else {
    // Add missing top-level headers
    if (
      // Note doesn't have a first-level heading yet
      newBody.trim().startsWith('# ') === false &&
      // And it doesn't start with an icon image
      /^!\[\[[^|]+\|icon\]\]/.test(newBody.trim()) === false
    ) {
      newBody = `# ${basename}\n${newBody}`;
    }
  }

  // Add an empty line after each image (unless followed by a space,
  // meaning there are more images on the same line)
  newBody = newBody.replaceAll(
    /(!\[\[.*?\]\]|!\[.*?\]\([^)]+\))(?! )/g,
    '$1\n\n'
  );

  // Cleanup whitespace only lines and multiple new lines
  newBody = newBody.replaceAll(/^\s+$/gm, '').replaceAll(/\n\n\n+/gm, '\n\n');

  return { newFrontmatter, newBody, newFile };
}

async function updateNotes(renamedFiles: Map<string, string>): Promise<void> {
  let updatedCount = 0;

  const allNotes = await Array.fromAsync(
    fs.glob(path.join(dirs.obsidianVault, ALL_NOTES_PATTERN))
  );

  // Gather all attachment filenames
  const imageFiles = await Array.fromAsync(
    fs.glob(path.join(dirs.obsidianVault, ALL_IMAGES_PATTERN))
  );
  const attachmentNames = new Set(
    imageFiles.map((imagePath) => path.basename(imagePath).normalize('NFC'))
  );

  for (const file of allNotes) {
    try {
      const content = await fs.readFile(file, 'utf8');
      const { frontmatter, body } = parseFrontmatter(content);

      const { newFrontmatter, newBody, newFile } = await updateNote({
        frontmatter,
        body,
        file,
        allNotes,
        renamedFiles,
        attachmentNames,
      });

      const newContent =
        Object.keys(newFrontmatter).length > 0
          ? `${serializeFrontmatter(newFrontmatter)}\n${newBody}`
          : newBody;

      // Update file if the contents was changed
      if (newContent !== content) {
        updatedCount++;
        // Write into temp file outside iCloud's watch path, then atomically
        // rename onto the destination so iCloud never observes a partial note.
        await atomicWrite(file, (tempFile) =>
          fs.writeFile(tempFile, newContent, 'utf8')
        );
      }

      // Move old file if the name was changed
      if (newFile !== file) {
        await fs.mkdir(path.dirname(newFile), { recursive: true });
        await fs.rename(file, newFile);
        console.log(`${getBasename(file)} → ${getBasename(newFile)}`);
      }
    } catch (error) {
      printWarning(`Error updating ${file}:`, getErrorStack(error));
    }
  }

  console.log(`\nUpdated ${updatedCount} notes`);
}

async function cleanObsidianTrash(): Promise<void> {
  const imageFiles = await Array.fromAsync(
    fs.glob(path.join(OBSIDIAN_TRASH_DIR, ALL_IMAGES_PATTERN))
  );

  if (imageFiles.length === 0) {
    return;
  }

  for (const imagePath of imageFiles) {
    await moveToTrash(imagePath);
  }

  console.log(`\nMoved ${imageFiles.length} images from .trash`);
}

async function backupVault(): Promise<void> {
  await fs.mkdir(BACKUP_DIR, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const backupFile = path.join(BACKUP_DIR, `murder_backup_${today}.zip`);

  // Skip if already backed up today
  try {
    await fs.access(backupFile);
    console.log('Backup already exists for today, skipping');
    return;
  } catch {
    // File doesn't exist, proceed with backup
  }

  console.log(`Creating backup: ${path.basename(backupFile)}…`);
  execSync(
    `zip -r -q ${JSON.stringify(backupFile)} . -x "./zz-attachments/*" "./.trash/*"`,
    { cwd: dirs.obsidianVault }
  );
  const stats = await fs.stat(backupFile);
  console.log(`  ↪ Backup created (${prettyBytes(stats.size)})`);
}

/**
 * Heuristic iCloud sync diagnostics.
 *
 * Apple exposes no reliable per-file "is uploaded?" API on modern macOS
 * (`kMDItemIsUbiquitous` is unpopulated, `brctl dump` redacts filenames), so we
 * surface the signals we *can* trust:
 *
 * - Container-level health from `brctl status`
 * - Filename/path patterns iCloud silently rejects
 * - Stale `.icloud` placeholder files alongside materialized files
 * - File-count mismatch between disk and CloudDocs' own item table
 */
async function checkICloudSync(): Promise<void> {
  const ICLOUD_MARKER = `${path.sep}Mobile Documents${path.sep}`;
  const resolvedVault = await fs.realpath(dirs.obsidianVault);
  if (resolvedVault.includes(ICLOUD_MARKER) === false) {
    console.log('Vault is not in iCloud, skipping sync diagnostics');
    return;
  }

  // Container name as brctl wants it: iCloud~md~obsidian → iCloud.md.obsidian
  const containerMatch = resolvedVault.match(
    /Mobile Documents\/([^/]+)\/Documents/
  );
  if (containerMatch === null) {
    console.log('Could not derive iCloud container from vault path');
    return;
  }
  const container = containerMatch[1].replaceAll('~', '.');

  // 1. Container-level health
  try {
    const status = execSync(`brctl status ${JSON.stringify(container)}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (/error|stuck|needs-sync:YES/i.test(status)) {
      printWarning('Container reports problems:', status);
    }
  } catch (error) {
    printWarning('brctl status failed:', getErrorMessage(error));
  }

  // 2. Per-file structural checks
  const issues: string[] = [];
  let regularFiles = 0;
  const allFiles = await Array.fromAsync(
    fs.glob(path.join(dirs.obsidianVault, '**/*'))
  );
  for (const file of allFiles) {
    const stats = await fs.stat(file).catch(() => null);
    if (stats === null || stats.isFile() === false) {
      continue;
    }
    regularFiles++;

    const name = path.basename(file);
    const rel = path.relative(dirs.obsidianVault, file);

    if (name.includes(':')) {
      issues.push(`Colon in name: ${rel}`);
    }
    if (/[ .]$/.test(path.parse(name).name)) {
      issues.push(`Trailing space or dot in basename: ${rel}`);
    }
    if (Buffer.byteLength(name, 'utf8') > 255) {
      issues.push(`Filename longer than 255 bytes: ${rel}`);
    }
    if (file.includes('.nosync/') || name.endsWith('.nosync')) {
      issues.push(`In .nosync (iCloud opt-out): ${rel}`);
    }
    try {
      await fs.access(path.join(path.dirname(file), `.${name}.icloud`));
      issues.push(`Stale .icloud placeholder beside file: ${rel}`);
    } catch {
      // No placeholder, fine
    }
  }

  // 3. Disk vs CloudDocs item-count comparison.
  //
  // `brctl dump` redacts filenames, so we cannot pinpoint which file is
  // missing, only that the totals diverge.
  try {
    const dump = execSync(`brctl dump ${JSON.stringify(container)}`, {
      encoding: 'utf8',
      maxBuffer: 128 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
      // Strip ANSI colour escapes that brctl injects between `i:` and `<`
      // oxlint-disable-next-line no-control-regex
      .replaceAll(/\u001B\[[0-9;]*m/g, '');
    const dumpItems = (dump.match(/^\s*i:</gm) ?? []).length;
    console.log(`Disk: ${regularFiles} files; CloudDocs: ${dumpItems} items`);
    const missing = regularFiles - dumpItems;
    if (missing > regularFiles * 0.05) {
      printWarning(
        `CloudDocs knows about ${missing} fewer items than disk has: some files may not be uploaded.\n   Try: 'killall bird', then re-save the suspect file, or move it out of the vault and back in.`
      );
    }
  } catch (error) {
    printWarning('brctl dump failed:', getErrorMessage(error));
  }

  if (issues.length > 0) {
    const shown = issues.slice(0, 30).map((issue) => `   ${issue}`);
    if (issues.length > 30) {
      shown.push(`   … and ${issues.length - 30} more`);
    }
    printWarning(`${issues.length} filename issues:\n${shown.join('\n')}`);
  }
}

async function main(): Promise<void> {
  try {
    await fs.access(dirs.obsidianVault);
  } catch {
    log.error('\n✕ Error: Vault directory does not exist:', dirs.obsidianVault);
    process.exit(1);
  }

  await fs.mkdir(TRASH_DIR, { recursive: true });

  console.log('\n Checking iCloud health…\n');
  await checkICloudSync();

  console.log('\n Backing up vault…\n');
  await backupVault();

  console.log('\n Gathering files…');
  const markdownFiles = await Array.fromAsync(
    fs.glob(path.join(dirs.obsidianVault, ALL_NOTES_PATTERN))
  );
  const imageFiles = await Array.fromAsync(
    fs.glob(path.join(dirs.obsidianVault, ALL_IMAGES_PATTERN))
  );
  console.log(
    `\nFound ${markdownFiles.length} notes and ${imageFiles.length} images`
  );

  console.log('\n󰚰 Updating images…\n');

  console.log('\n Optimizing images…\n');
  const renamedFiles = await optimizeImages(imageFiles);

  console.log('\n󰚰 Updating notes…\n');

  await updateNotes(renamedFiles);

  console.log('\n Collecting used images from Markdown…\n');
  const updatedMarkdownFiles = await Array.fromAsync(
    fs.glob(path.join(dirs.obsidianVault, ALL_NOTES_PATTERN))
  );
  const usedImages = await findUsedImages(updatedMarkdownFiles);
  console.log(`\nFound ${usedImages.size} image usages`);

  console.log('\n Removing unused images…\n');
  const remainingImageFiles = await Array.fromAsync(
    fs.glob(path.join(dirs.obsidianVault, ALL_IMAGES_PATTERN))
  );
  await removeUnusedImages(remainingImageFiles, usedImages);

  console.log('\n Cleaning Obsidian trash…\n');
  await cleanObsidianTrash();

  if (warnings.length > 0) {
    log.warn(`\n ${warnings.length} warnings:\n`);
    for (const message of warnings) {
      console.log(`• ${message}`);
    }
  }
}

await run(main, { printDone: true });
