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
    rating: optionalNumber(metadata.Rating),
  };
}
