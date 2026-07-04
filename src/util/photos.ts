import path from 'node:path';

export const IMPORT_DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})_/;

export interface ParsedExifDate {
  date: string;
  year: string;
  datetime: Date;
}

/** Parse ExifTool `DateTimeOriginal` (`2026:07:03 14:42:00`) into date parts. */
export function parseExifDate(
  dateTimeOriginal: string | undefined
): ParsedExifDate | undefined {
  if (dateTimeOriginal === undefined) {
    return undefined;
  }

  const match = dateTimeOriginal.match(
    /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/
  );
  if (match === null) {
    return undefined;
  }

  const [, year, month, day, hour, minute, second] = match;
  return {
    date: `${year}-${month}-${day}`,
    year,
    datetime: new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`),
  };
}

/** Read `YYYY-MM-DD` from names like `2026-07-03_1234_Artem_Sapegin.jpg`. */
export function getPhotoFilenameDate(filename: string): string | undefined {
  return path.basename(filename).match(IMPORT_DATE_PREFIX)?.[1];
}

/**
 * Extract the numeric suffix from camera filenames like `_MG_1234.CR2` →
 * `1234`.
 */
export function getSuffix(filename: string): string | undefined {
  const stem = path
    .basename(filename, path.extname(filename))
    .replace(IMPORT_DATE_PREFIX, '');
  return stem.match(/^(\d+)/)?.[1] ?? stem.match(/(\d+)$/)?.[1];
}

/**
 * Build a dated photo filename from EXIF and the original basename.
 * Examples: `IMG_9488.jpeg` → `2026_IMG_9488.jpeg`, `_MG_1234.JPG` →
 * `2026-07-03_1234_Artem_Sapegin.jpg`.
 */
export function getFullMobilePhotoName(
  originalBasename: string,
  exif: ParsedExifDate
): string {
  const ext = path.extname(originalBasename).toLowerCase();

  if (/^IMG_/i.test(originalBasename)) {
    return `${exif.year}_${path.basename(originalBasename, path.extname(originalBasename))}${ext}`;
  }

  const mgMatch = originalBasename.match(/^_MG_(\d+)/i);
  if (mgMatch !== null) {
    return `${exif.date}_${mgMatch[1]}_Artem_Sapegin${ext}`;
  }

  if (IMPORT_DATE_PREFIX.test(originalBasename)) {
    return originalBasename;
  }

  const suffix = getSuffix(originalBasename);
  if (suffix !== undefined) {
    return `${exif.date}_${suffix}_Artem_Sapegin${ext}`;
  }

  return originalBasename;
}
