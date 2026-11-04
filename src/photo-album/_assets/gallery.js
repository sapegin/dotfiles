// Client-side gallery: layout + DOM from embedded JSON (no HTML fetch).

import { createRows, getMaxColumns } from './layout.js';

function readImages() {
	const dataElement = document.querySelector('#gallery-data');
	if (dataElement === null) {
		return [];
	}
	const payload = JSON.parse(dataElement.textContent);
	return payload.map((image) => ({
		...image,
		captureDate: new Date(image.captureDate),
	}));
}

function renderRow(row) {
	const rowElement = document.createElement('div');
	rowElement.className = `row row-${row.kind} row-cols-${row.columns}`;

	for (const image of row.images) {
		const photo = document.createElement('div');
		photo.className = image.filename.startsWith('Instax')
			? 'photo photo-instax'
			: 'photo';

		const img = document.createElement('img');
		img.src = `/images/${encodeURIComponent(image.filename)}`;
		img.alt = image.title ?? image.filename;
		img.loading = 'lazy';
		photo.append(img);
		rowElement.append(photo);
	}

	return rowElement;
}

const gallery = document.querySelector('#gallery');
const images = readImages();

if (gallery !== null) {
	let currentColumns = 0;

	const limitDayGap = gallery.dataset.limitDayGap === 'true';

	function render() {
		const nextColumns = getMaxColumns(globalThis.innerWidth);
		if (nextColumns === currentColumns) {
			return;
		}
		currentColumns = nextColumns;
		const rows = createRows(images, nextColumns, { limitDayGap });
		gallery.replaceChildren(...rows.map(renderRow));
	}

	let resizeTimer;
	globalThis.addEventListener('resize', () => {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(render, 100);
	});

	render();
}
