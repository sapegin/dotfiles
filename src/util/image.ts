import sharp from 'sharp';

type SharpPipeline = ReturnType<typeof sharp>;

/** Pixel size from an open Sharp pipeline. */
async function getPublishedImageDimensions(
  image: SharpPipeline,
  imagePath?: string
): Promise<{ width: number; height: number }> {
  const { width, height } = await image.metadata();
  if (!width || !height) {
    throw new Error(`Missing dimensions: ${imagePath ?? 'image'}`);
  }
  return { width, height };
}

/** Dominant color as `#rrggbb`, for image loading placeholders. */
async function getDominantColor(image: SharpPipeline): Promise<string> {
  const { dominant } = await image.stats();
  const hex = [dominant.r, dominant.g, dominant.b]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('');
  return `#${hex}`;
}

/** Dimensions and dominant color for a published image file on disk. */
export async function getPublishedImageMetadata(
  imagePath: string
): Promise<{ width: number; height: number; color: string }> {
  const image = sharp(imagePath);
  const { width, height } = await getPublishedImageDimensions(image, imagePath);
  const color = await getDominantColor(image);
  return { width, height, color };
}
