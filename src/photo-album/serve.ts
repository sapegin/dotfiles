// HTTP server and HTML rendering for the local photo album.

import { once } from 'node:events';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { dirs } from '../util/files.ts';
import { UserError } from '../util/tui.ts';
import {
  buildPhotoAlbumIndex,
  createRows,
  filterByCity,
  filterBySeries,
  filterByYear,
  formatSeriesTitle,
  listCityAlbums,
  listSeries,
  listYears,
  PHOTO_ALBUM_PORT,
  renderTemplate,
  type ImageRow,
  type PhotoAlbumImage,
} from './album.ts';

const PHOTO_ALBUM_DIR = import.meta.dirname;
const PHOTO_ALBUM_ASSETS_DIR = path.join(PHOTO_ALBUM_DIR, '_assets');

/** First non-internal IPv4 address, if any. */
function getLanAddress(): string | undefined {
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && entry.internal === false) {
        return entry.address;
      }
    }
  }
  return undefined;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function readTemplate(filename: string): Promise<string> {
  return fs.readFile(path.join(PHOTO_ALBUM_DIR, filename), 'utf8');
}

function renderLinkList(
  items: readonly { href: string; label: string; count: number }[]
): string {
  if (items.length === 0) {
    return '';
  }
  const links = items
    .map(
      ({ href, label, count }) =>
        `        <li><a href="${href}">${escapeHtml(label)} <span class="count">${count}</span></a></li>`
    )
    .join('\n');
  return `      <ul>\n${links}\n      </ul>`;
}

async function generateIndexHtml(
  images: readonly PhotoAlbumImage[]
): Promise<string> {
  const years = listYears(images);
  const countries = listCityAlbums(images);
  const seriesList = listSeries(images);

  const yearsHtml =
    years.length === 0
      ? '      <p>No dated photos.</p>'
      : renderLinkList(
          years.map(({ year, count }) => ({
            href: `/year/${encodeURIComponent(year)}`,
            label: year,
            count,
          }))
        );

  const placesHtml =
    countries.length === 0
      ? '      <p>No city IPTC metadata yet.</p>'
      : countries
          .map(({ country, cities }) => {
            const list = renderLinkList(
              cities.map(({ city, count }) => ({
                href: `/city/${encodeURIComponent(country)}/${encodeURIComponent(city)}`,
                label: city,
                count,
              }))
            );
            return `      <div class="places-country">
        <h3>${escapeHtml(country)}</h3>
${list}
      </div>`;
          })
          .join('\n');

  const seriesHtml =
    seriesList.length === 0
      ? '      <p>No series keywords yet.</p>'
      : renderLinkList(
          seriesList.map(({ series, count }) => ({
            href: `/series/${encodeURIComponent(series)}`,
            label: formatSeriesTitle(series),
            count,
          }))
        );

  const template = await readTemplate('index.html');
  return renderTemplate(template, {
    years: yearsHtml,
    places: placesHtml,
    series: seriesHtml,
  });
}

async function generateGalleryHtml(
  title: string,
  rows: readonly ImageRow[]
): Promise<string> {
  const rowsHtml = rows
    .map((row) => {
      const imagesHtml = row.images
        .map((img) => {
          const imgPath = `/images/${encodeURIComponent(img.filename)}`;
          const isInstax = img.filename.startsWith('Instax');
          const photoClass = isInstax ? 'photo photo-instax' : 'photo';
          const alt = escapeHtml(img.title ?? img.filename);
          return `<div class="${photoClass}"><img src="${imgPath}" alt="${alt}" loading="lazy"></div>`;
        })
        .join('\n          ');

      const rowClass = `row-${row.orientation} row-cols-${row.columns}`;
      return `      <div class="row ${rowClass}">
          ${imagesHtml}
        </div>`;
    })
    .join('\n');

  const template = await readTemplate('gallery.html');
  return renderTemplate(template, {
    title: escapeHtml(title),
    rows: rowsHtml,
  });
}

function contentTypeForFilename(filename: string): string {
  if (path.extname(filename).toLowerCase() === '.css') {
    return 'text/css; charset=utf-8';
  }
  return 'image/jpeg';
}

function sendHtml(
  response: http.ServerResponse,
  status: number,
  html: string
): void {
  response.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
  });
  response.end(html);
}

function sendText(
  response: http.ServerResponse,
  status: number,
  text: string
): void {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(text);
}

async function sendFile(
  response: http.ServerResponse,
  filePath: string,
  cacheControl = 'public, max-age=86400'
): Promise<void> {
  const stream = fsSync.createReadStream(filePath);
  try {
    await once(stream, 'open');
  } catch {
    sendText(response, 404, 'Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': contentTypeForFilename(filePath),
    'Cache-Control': cacheControl,
  });

  try {
    await pipeline(stream, response);
  } catch {
    if (!response.writableEnded) {
      response.destroy();
    }
  }
}

async function sendImage(
  response: http.ServerResponse,
  filename: string
): Promise<void> {
  // Basename only — blocks path traversal via /images/../…
  const safeName = path.basename(filename);
  if (safeName === '' || safeName !== filename) {
    sendText(response, 400, 'Bad request');
    return;
  }

  await sendFile(response, path.join(dirs.iCloudWebPhotos, safeName));
}

async function sendAsset(
  response: http.ServerResponse,
  filename: string
): Promise<void> {
  const safeName = path.basename(filename);
  if (safeName === '' || safeName !== filename) {
    sendText(response, 400, 'Bad request');
    return;
  }

  // CSS edits should show up without a long browser cache.
  const cacheControl =
    path.extname(safeName) === '.css' ? 'no-cache' : 'public, max-age=86400';
  await sendFile(
    response,
    path.join(PHOTO_ALBUM_ASSETS_DIR, safeName),
    cacheControl
  );
}

/** Build the index and serve the LAN gallery until the process exits. */
export async function servePhotoAlbum(): Promise<void> {
  try {
    await fs.access(dirs.iCloudWebPhotos);
  } catch {
    throw new UserError(
      `Photo source directory does not exist: ${dirs.iCloudWebPhotos}`
    );
  }

  console.log('Building photo album index…');
  const { images } = await buildPhotoAlbumIndex();

  const server = http.createServer((request, response) => {
    void (async () => {
      const method = request.method ?? 'GET';
      const url = new URL(
        request.url ?? '/',
        `http://${request.headers.host ?? 'localhost'}`
      );
      const { pathname } = url;

      try {
        if (method !== 'GET') {
          sendText(response, 405, 'Method not allowed');
          return;
        }

        if (pathname === '/') {
          sendHtml(response, 200, await generateIndexHtml(images));
          return;
        }

        const assetMatch = pathname.match(/^\/_assets\/([^/]+)$/);
        if (assetMatch) {
          await sendAsset(response, decodeURIComponent(assetMatch[1]));
          return;
        }

        const yearMatch = pathname.match(/^\/year\/([^/]+)$/);
        if (yearMatch) {
          const year = decodeURIComponent(yearMatch[1]);
          const yearImages = filterByYear(images, year);
          if (yearImages.length === 0) {
            sendText(response, 404, 'Not found');
            return;
          }
          sendHtml(
            response,
            200,
            await generateGalleryHtml(year, createRows(yearImages))
          );
          return;
        }

        const cityMatch = pathname.match(/^\/city\/([^/]+)\/([^/]+)$/);
        if (cityMatch) {
          const country = decodeURIComponent(cityMatch[1]);
          const city = decodeURIComponent(cityMatch[2]);
          const cityImages = filterByCity(images, country, city);
          if (cityImages.length === 0) {
            sendText(response, 404, 'Not found');
            return;
          }
          sendHtml(
            response,
            200,
            await generateGalleryHtml(
              `${city}, ${country}`,
              createRows(cityImages)
            )
          );
          return;
        }

        const seriesMatch = pathname.match(/^\/series\/([^/]+)$/);
        if (seriesMatch) {
          const series = decodeURIComponent(seriesMatch[1]);
          const seriesImages = filterBySeries(images, series);
          if (seriesImages.length === 0) {
            sendText(response, 404, 'Not found');
            return;
          }
          sendHtml(
            response,
            200,
            await generateGalleryHtml(
              formatSeriesTitle(series),
              createRows(seriesImages)
            )
          );
          return;
        }

        const imageMatch = pathname.match(/^\/images\/([^/]+)$/);
        if (imageMatch) {
          await sendImage(response, decodeURIComponent(imageMatch[1]));
          return;
        }

        sendText(response, 404, 'Not found');
      } catch (error) {
        console.error(error);
        sendText(response, 500, 'Internal server error');
      }
    })();
  });

  server.listen(PHOTO_ALBUM_PORT, '0.0.0.0');
  await Promise.race([
    once(server, 'listening'),
    once(server, 'error').then(([error]) => {
      throw error;
    }),
  ]);

  const lanAddress = getLanAddress();
  console.log(`\nLocal:        http://localhost:${PHOTO_ALBUM_PORT}`);
  if (lanAddress === undefined) {
    console.log('Network:      (no LAN address found)');
  } else {
    console.log(`Network:      http://${lanAddress}:${PHOTO_ALBUM_PORT}`);
  }
}
