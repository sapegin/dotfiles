import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

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

export interface ExifMetadata {
  date?: string;
  year?: string;
  datetime?: Date;
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

function parseExifDate(dateTimeOriginal: string | undefined):
  | {
      date: string;
      year: string;
      datetime: Date;
    }
  | undefined {
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
    year,
    date: `${year}-${month}-${day}`,
    datetime: new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`),
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
