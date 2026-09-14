import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { type DateParts } from './time.ts';

const execFileAsync = promisify(execFile);

interface ExifToolOutput {
  DateTimeOriginal?: unknown;
  GPSLatitude?: unknown;
  GPSLongitude?: unknown;
  ImageWidth?: unknown;
  ImageHeight?: unknown;
  Make?: unknown;
  ObjectName?: unknown;
  'Caption-Abstract'?: unknown;
  Keywords?: unknown;
  Rating?: unknown;
}

interface ParsedExifDate {
  readonly date: string;
  readonly year: string;
  readonly datetime: Date;
  readonly dateParts: DateParts;
}

export interface ExifMetadata {
  date?: string;
  year?: string;
  datetime?: Date;
  dateParts?: DateParts;
  gpsLatitude?: number;
  gpsLongitude?: number;
  imageWidth?: number;
  imageHeight?: number;
  make?: string;
  title?: string;
  caption?: string;
  keywords?: string[];
  rating?: number;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

export function parseExifDateParts(
  dateTimeOriginal: string | undefined
): DateParts | undefined {
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
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  };
}

function parseExifDate(
  dateTimeOriginal: string | undefined
): ParsedExifDate | undefined {
  const dateParts = parseExifDateParts(dateTimeOriginal);
  if (dateParts === undefined) {
    return undefined;
  }

  const { year, month, day, hour, minute, second } = dateParts;
  const yearString = String(year);
  const monthString = String(month).padStart(2, '0');
  const dayString = String(day).padStart(2, '0');
  const hourString = String(hour).padStart(2, '0');
  const minuteString = String(minute).padStart(2, '0');
  const secondString = String(second).padStart(2, '0');
  return {
    year: yearString,
    date: `${yearString}-${monthString}-${dayString}`,
    datetime: new Date(
      `${yearString}-${monthString}-${dayString}T${hourString}:${minuteString}:${secondString}`
    ),
    dateParts,
  };
}

function optionalStringArray(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  return [];
}

export async function readExifMetadata(
  filePath: string
): Promise<ExifMetadata> {
  const { stdout } = await execFileAsync(
    'exiftool',
    [
      '-j',
      '-n',
      '-DateTimeOriginal',
      '-GPSLatitude',
      '-GPSLongitude',
      '-ImageWidth',
      '-ImageHeight',
      '-Make',
      '-ObjectName',
      '-Caption-Abstract',
      '-Keywords',
      '-Rating',
      filePath,
    ],
    { encoding: 'utf8' }
  );
  const [metadata] = JSON.parse(stdout) as [ExifToolOutput?];
  if (metadata === undefined) {
    return {};
  }
  const dateTimeOriginal = optionalString(metadata.DateTimeOriginal);
  const parsedDate = parseExifDate(dateTimeOriginal);

  return {
    ...parsedDate,
    gpsLatitude: optionalNumber(metadata.GPSLatitude),
    gpsLongitude: optionalNumber(metadata.GPSLongitude),
    imageWidth: optionalNumber(metadata.ImageWidth),
    imageHeight: optionalNumber(metadata.ImageHeight),
    make: optionalString(metadata.Make),
    title: optionalString(metadata.ObjectName),
    caption: optionalString(metadata['Caption-Abstract']),
    keywords: optionalStringArray(metadata.Keywords),
    rating: optionalNumber(metadata.Rating),
  };
}
