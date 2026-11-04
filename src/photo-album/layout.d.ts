export type KnownKind = 'fun' | 'landscape' | 'portrait' | 'square';
export type ImageKind = KnownKind | 'unknown';

/** Fields needed to group photos into rows and render the gallery. */
export interface LayoutImage {
  filename: string;
  title?: string;
  captureDate: Date;
  kind: ImageKind;
}

export interface ImageRow {
  kind: KnownKind;
  images: LayoutImage[];
  firstPhotoDate: Date;
  columns: number;
}

/** Mobile: one column. Below this width → `maxColumns = 1`. */
export const LAYOUT_MOBILE_MAX_WIDTH: 600;
/** Very large (≈27″ / TV): allow 3 columns. Below this → `maxColumns = 2`. */
export const LAYOUT_LARGE_MIN_WIDTH: 1800;

/**
 * Cap photos-per-row for the current viewport width.
 * Portrait/square rows use this; fun rows always fill up to this;
 * landscape is always one per row.
 */
export function getMaxColumns(viewportWidth: number): number;

/**
 * Build gallery rows.
 * Landscapes alone; portraits and squares in same-kind rows;
 * fun (any format) together in rows of up to `maxColumns`.
 */
export function createRows(
  images: readonly LayoutImage[],
  maxColumns?: number
): ImageRow[];
