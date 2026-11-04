// Gallery layout: shared by the Node album module and the browser gallery.

/** @typedef {'fun' | 'landscape' | 'portrait' | 'square'} KnownKind */
/** @typedef {KnownKind | 'unknown'} ImageKind */

/** Mobile: one column. Below this width → `maxColumns = 1`. */
export const LAYOUT_MOBILE_MAX_WIDTH = 600;
/** Very large (≈27″ / TV): allow 3 columns. Below this → `maxColumns = 2`. */
export const LAYOUT_LARGE_MIN_WIDTH = 1800;

/**
 * Cap photos-per-row for the current viewport width.
 * Portrait/square rows use this; fun rows always fill up to this;
 * landscape is always one per row.
 */
export function getMaxColumns(viewportWidth) {
	if (viewportWidth <= LAYOUT_MOBILE_MAX_WIDTH) {
		return 1;
	}
	if (viewportWidth < LAYOUT_LARGE_MIN_WIDTH) {
		return 2;
	}
	return 3;
}

const MAX_DAYS_DIFF = 5;

function byCaptureDate(a, b) {
	return a.captureDate.getTime() - b.captureDate.getTime();
}

function daysBetween(a, b) {
	return (
		Math.abs(a.captureDate.getTime() - b.captureDate.getTime()) /
		(1000 * 60 * 60 * 24)
	);
}

/** Pack a chronological photo list into rows of up to `perRow`. */
function packPhotos(photos, kind, perRow, limitDayGap) {
	const rows = [];
	let i = 0;

	while (i < photos.length) {
		const currentPhotosPerRow = Math.min(perRow, photos.length - i);
		const rowPhotos = [];
		for (let j = 0; j < currentPhotosPerRow && i + j < photos.length; j++) {
			const rowPhoto = photos[i + j];
			const lastPhoto = rowPhotos.at(-1);
			if (
				limitDayGap &&
				lastPhoto !== undefined &&
				daysBetween(rowPhoto, lastPhoto) > MAX_DAYS_DIFF
			) {
				break;
			}
			rowPhotos.push(rowPhoto);
		}

		rows.push({
			kind,
			images: rowPhotos,
			firstPhotoDate: rowPhotos[0].captureDate,
			columns: rowPhotos.length,
		});
		i += rowPhotos.length;
	}

	return rows;
}

function canMergeRows(a, b) {
	if (a.columns !== 1 || b.columns !== 1 || a.kind !== b.kind) {
		return false;
	}
	return a.kind === 'fun' || a.kind === 'portrait' || a.kind === 'square';
}

/** Merge leftover singles into fuller rows of the same kind. */
function mergeSinglePhotoRows(rows, maxColumns, limitDayGap) {
	const result = [];
	let i = 0;

	while (i < rows.length) {
		const row = rows[i];
		const mergeableSingle =
			row.columns === 1 &&
			(row.kind === 'fun' || row.kind === 'portrait' || row.kind === 'square');

		if (!mergeableSingle) {
			result.push(row);
			i++;
			continue;
		}

		const mergeable = [row];
		let j = i + 1;

		while (j < rows.length && mergeable.length < maxColumns) {
			const nextRow = rows[j];
			const lastImage = mergeable.at(-1).images.at(-1);
			const nextImage = nextRow.images[0];
			const withinDayGap =
				!limitDayGap || daysBetween(lastImage, nextImage) <= MAX_DAYS_DIFF;
			if (canMergeRows(row, nextRow) && withinDayGap) {
				mergeable.push(nextRow);
				j++;
			} else {
				break;
			}
		}

		if (mergeable.length >= 2) {
			const mergedImages = mergeable.flatMap((r) => r.images);
			result.push({
				kind: row.kind,
				images: mergedImages,
				firstPhotoDate: row.firstPhotoDate,
				columns: mergedImages.length,
			});
			i = j;
		} else {
			result.push(row);
			i++;
		}
	}

	return result;
}

/**
 * Build gallery rows.
 * Landscapes alone; portraits and squares in same-kind rows;
 * fun (any format) together in rows of up to `maxColumns`.
 * When `limitDayGap` is true (yearly galleries), photos more than five days
 * apart do not share a row.
 */
export function createRows(
	images,
	maxColumns = 3,
	{ limitDayGap = false } = {}
) {
	const buckets = {
		fun: [],
		landscape: [],
		portrait: [],
		square: [],
	};

	for (const img of images) {
		if (img.kind !== 'unknown') {
			buckets[img.kind].push(img);
		}
	}

	const allRows = [];

	for (const kind of Object.keys(buckets)) {
		const photos = buckets[kind];
		if (photos.length === 0) {
			continue;
		}
		const perRow = kind === 'landscape' ? 1 : maxColumns;
		allRows.push(
			...packPhotos(photos.toSorted(byCaptureDate), kind, perRow, limitDayGap)
		);
	}

	return mergeSinglePhotoRows(
		allRows.toSorted(
			(a, b) => a.firstPhotoDate.getTime() - b.firstPhotoDate.getTime()
		),
		maxColumns,
		limitDayGap
	);
}
