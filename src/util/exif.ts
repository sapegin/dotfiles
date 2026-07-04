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
  dateTimeOriginal?: string;
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

  return {
    dateTimeOriginal: optionalString(metadata.DateTimeOriginal),
    gpsLatitude: optionalNumber(metadata.GPSLatitude),
    gpsLongitude: optionalNumber(metadata.GPSLongitude),
    imageWidth: optionalNumber(metadata.ImageWidth),
    imageHeight: optionalNumber(metadata.ImageHeight),
    make: optionalString(metadata.Make),
    rating: optionalNumber(metadata.Rating),
  };
}
