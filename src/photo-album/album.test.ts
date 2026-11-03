import { describe, expect, test } from 'vitest';
import {
  collectKnownCities,
  filterByCity,
  filterBySeries,
  filterByYear,
  formatSeriesTitle,
  isSeriesKeyword,
  listCityAlbums,
  listSeries,
  listYears,
  recordToImage,
  recordsToImages,
  renderTemplate,
  resolveAlbumCity,
  type PhotoAlbumImage,
  type PhotoAlbumRecord,
} from './album.ts';

function record(
  partial: Partial<PhotoAlbumRecord> & Pick<PhotoAlbumRecord, 'filename'>
): PhotoAlbumRecord {
  return {
    mtimeMs: 1,
    captureDate: '2024-06-15T12:00:00.000Z',
    width: 2000,
    height: 1333,
    make: 'Canon',
    rating: 0,
    keywords: [],
    ...partial,
  };
}

describe(isSeriesKeyword, () => {
  test('treats hyphenated keywords as series', () => {
    expect(isSeriesKeyword('what-we-do-in-the-shadows')).toBe(true);
    expect(isSeriesKeyword('when-the-moon-goes-to-bed')).toBe(true);
  });

  test('rejects keywords without a hyphen', () => {
    expect(isSeriesKeyword('Boston')).toBe(false);
    expect(isSeriesKeyword('fog')).toBe(false);
  });
});

describe(formatSeriesTitle, () => {
  test('title-cases hyphenated series names', () => {
    expect(formatSeriesTitle('berliner-fernsehturm')).toBe(
      'Berliner Fernsehturm'
    );
    expect(formatSeriesTitle('when-the-moon-goes-to-bed')).toBe(
      'When The Moon Goes To Bed'
    );
  });

  test('drops a trailing series suffix', () => {
    expect(formatSeriesTitle('cars-series')).toBe('Cars');
    expect(formatSeriesTitle('moire-series')).toBe('Moire');
  });

  test('formats dotted version keywords', () => {
    expect(formatSeriesTitle('1-0')).toBe('1.0');
    expect(formatSeriesTitle('2-0')).toBe('2.0');
    expect(formatSeriesTitle('2-0-series')).toBe('2.0');
    expect(formatSeriesTitle('butovo-1-0')).toBe('Butovo 1.0');
    expect(formatSeriesTitle('butovo-1-0-series')).toBe('Butovo 1.0');
  });
});

describe(renderTemplate, () => {
  test('replaces known placeholders and leaves unknown ones', () => {
    expect(
      renderTemplate('Hello {{name}} {{missing}}', { name: 'World' })
    ).toBe('Hello World {{missing}}');
  });
});

describe(resolveAlbumCity, () => {
  const known = new Set(['Valencia', 'Boston']);

  test('uses city when state is not a known city', () => {
    expect(resolveAlbumCity('Mislata', 'Comunidad Valenciana', known)).toBe(
      'Mislata'
    );
  });

  test('uses state when it matches a known city', () => {
    expect(resolveAlbumCity('Mislata', 'Valencia', known)).toBe('Valencia');
  });

  test('falls back to city when state is empty', () => {
    expect(resolveAlbumCity('Boston', undefined, known)).toBe('Boston');
    expect(resolveAlbumCity('Boston', '', known)).toBe('Boston');
  });

  test('returns undefined when both are missing', () => {
    expect(resolveAlbumCity(undefined, undefined, known)).toBeUndefined();
  });
});

describe(collectKnownCities, () => {
  test('collects non-empty city values', () => {
    expect(
      collectKnownCities([
        { city: 'Valencia' },
        { city: 'Mislata' },
        { city: '' },
        { city: undefined },
        { city: 'Valencia' },
      ])
    ).toStrictEqual(new Set(['Valencia', 'Mislata']));
  });
});

describe(recordsToImages, () => {
  test('collapses suburb cities into a parent city present in the library', () => {
    const images = recordsToImages([
      record({
        filename: 'a.jpg',
        city: 'Valencia',
        state: 'Valencia',
        country: 'Spain',
      }),
      record({
        filename: 'b.jpg',
        city: 'Mislata',
        state: 'Valencia',
        country: 'Spain',
        captureDate: '2024-07-01T12:00:00.000Z',
      }),
    ]);

    expect(images.map((image) => image.albumCity)).toStrictEqual([
      'Valencia',
      'Valencia',
    ]);
  });

  test('extracts series from keywords', () => {
    const [image] = recordsToImages([
      record({
        filename: 'a.jpg',
        keywords: ['fog', 'when-the-moon-goes-to-bed'],
      }),
    ]);
    expect(image.series).toStrictEqual(['when-the-moon-goes-to-bed']);
  });
});

describe('album listings and filters', () => {
  const images: PhotoAlbumImage[] = recordsToImages([
    record({
      filename: 'spain-valencia.jpg',
      city: 'Valencia',
      country: 'Spain',
      captureDate: '2024-01-01T12:00:00.000Z',
      keywords: ['trip-series'],
    }),
    record({
      filename: 'spain-mislata.jpg',
      city: 'Mislata',
      state: 'Valencia',
      country: 'Spain',
      captureDate: '2023-01-01T12:00:00.000Z',
      keywords: ['trip-series', 'fog'],
    }),
    record({
      filename: 'no-country.jpg',
      city: 'Home',
      captureDate: '2022-01-01T12:00:00.000Z',
    }),
  ]);

  test('lists years newest first', () => {
    expect(listYears(images)).toStrictEqual([
      { year: '2024', count: 1 },
      { year: '2023', count: 1 },
      { year: '2022', count: 1 },
    ]);
  });

  test('groups cities under countries and merges suburbs', () => {
    expect(listCityAlbums(images)).toStrictEqual([
      {
        country: 'Spain',
        cities: [{ country: 'Spain', city: 'Valencia', count: 2 }],
      },
      {
        country: 'Unknown',
        cities: [{ country: 'Unknown', city: 'Home', count: 1 }],
      },
    ]);
  });

  test('lists series with counts', () => {
    expect(listSeries(images)).toStrictEqual([
      { series: 'trip-series', count: 2 },
    ]);
  });

  test('filters by year, city, and series', () => {
    expect(
      filterByYear(images, '2024').map((image) => image.filename)
    ).toStrictEqual(['spain-valencia.jpg']);
    expect(
      filterByCity(images, 'Spain', 'Valencia').map((image) => image.filename)
    ).toStrictEqual(['spain-mislata.jpg', 'spain-valencia.jpg']);
    expect(
      filterByCity(images, 'Unknown', 'Home').map((image) => image.filename)
    ).toStrictEqual(['no-country.jpg']);
    expect(
      filterBySeries(images, 'trip-series').map((image) => image.filename)
    ).toStrictEqual(['spain-mislata.jpg', 'spain-valencia.jpg']);
  });
});

describe(recordToImage, () => {
  test('maps camera make to serious group and landscape orientation', () => {
    const image = recordToImage(
      record({ filename: 'a.jpg', make: 'Canon', width: 2000, height: 1000 }),
      new Set()
    );
    expect(image.group).toBe('serious');
    expect(image.orientation).toBe('landscape');
  });
});
