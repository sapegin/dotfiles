import { describe, expect, test } from 'vitest';
import {
  collectKnownCities,
  createRows,
  filterByCity,
  filterBySeries,
  filterByYear,
  formatSeriesTitle,
  getKind,
  getMaxColumns,
  isFilmScanCameraProfile,
  isSeriesKeyword,
  LAYOUT_LARGE_MIN_WIDTH,
  LAYOUT_MOBILE_MAX_WIDTH,
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
    isFilmScan: false,
    ...partial,
  };
}

describe(isSeriesKeyword, () => {
  test('treats lowercase hyphenated keywords as series', () => {
    expect(isSeriesKeyword('what-we-do-in-the-shadows')).toBe(true);
    expect(isSeriesKeyword('when-the-moon-goes-to-bed')).toBe(true);
    expect(isSeriesKeyword('1-0')).toBe(true);
  });

  test('rejects keywords without a hyphen or with uppercase', () => {
    expect(isSeriesKeyword('Boston')).toBe(false);
    expect(isSeriesKeyword('fog')).toBe(false);
    expect(isSeriesKeyword('U-Bahn')).toBe(false);
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

describe(isFilmScanCameraProfile, () => {
  test('detects Negative Lab Pro camera profiles', () => {
    expect(isFilmScanCameraProfile('Negative Lab v2.3')).toBe(true);
    expect(isFilmScanCameraProfile('Negative Lab v3.0')).toBe(true);
    expect(isFilmScanCameraProfile('Embedded')).toBe(false);
    expect(isFilmScanCameraProfile('Adobe Standard')).toBe(false);
    expect(isFilmScanCameraProfile(undefined)).toBe(false);
  });
});

describe(getKind, () => {
  test('marks Scan_ files below five stars as fun', () => {
    expect(
      getKind(
        record({ filename: 'Scan_1.jpg', rating: 0, width: 2000, height: 1000 })
      )
    ).toBe('fun');
    expect(
      getKind(
        record({ filename: 'Scan_1.jpg', rating: 4, width: 1000, height: 1500 })
      )
    ).toBe('fun');
    expect(
      getKind(
        record({ filename: 'Scan_1.jpg', rating: 5, width: 2000, height: 1000 })
      )
    ).toBe('landscape');
  });

  test('marks film scans below five stars as fun', () => {
    expect(
      getKind(
        record({
          filename: 'a.jpg',
          rating: 0,
          width: 2000,
          height: 1000,
          isFilmScan: true,
        })
      )
    ).toBe('fun');
    expect(
      getKind(
        record({
          filename: 'a.jpg',
          rating: 4,
          width: 1000,
          height: 1500,
          isFilmScan: true,
        })
      )
    ).toBe('fun');
    expect(
      getKind(
        record({
          filename: 'a.jpg',
          rating: 5,
          width: 2000,
          height: 1000,
          isFilmScan: true,
        })
      )
    ).toBe('landscape');
  });

  test('classifies portrait, square, and landscape by aspect ratio', () => {
    expect(
      getKind(record({ filename: 'a.jpg', width: 1000, height: 1500 }))
    ).toBe('portrait');
    expect(
      getKind(record({ filename: 'a.jpg', width: 1000, height: 1000 }))
    ).toBe('square');
    expect(
      getKind(record({ filename: 'a.jpg', width: 3000, height: 1000 }))
    ).toBe('landscape');
  });
});

describe(recordToImage, () => {
  test('sets kind from filename, rating, and dimensions', () => {
    const image = recordToImage(
      record({ filename: 'a.jpg', make: 'Canon', width: 2000, height: 1000 }),
      new Set()
    );
    expect(image.kind).toBe('landscape');
  });

  test('marks film scans below five stars as fun', () => {
    const image = recordToImage(
      record({
        filename: 'film.jpg',
        isFilmScan: true,
        rating: 3,
        width: 2000,
        height: 1000,
      }),
      new Set()
    );
    expect(image.kind).toBe('fun');
  });
});

describe(getMaxColumns, () => {
  test('returns 1 on mobile, 2 on normal, 3 on very large screens', () => {
    expect(getMaxColumns(LAYOUT_MOBILE_MAX_WIDTH)).toBe(1);
    expect(getMaxColumns(LAYOUT_MOBILE_MAX_WIDTH + 1)).toBe(2);
    expect(getMaxColumns(LAYOUT_LARGE_MIN_WIDTH - 1)).toBe(2);
    expect(getMaxColumns(LAYOUT_LARGE_MIN_WIDTH)).toBe(3);
  });
});

function photosOf(
  count: number,
  options: {
    make: string;
    width: number;
    height: number;
    namePrefix?: string;
  }
): PhotoAlbumImage[] {
  const namePrefix = options.namePrefix ?? 'p';
  return recordsToImages(
    Array.from({ length: count }, (_, index) =>
      record({
        filename: `${namePrefix}${index}.jpg`,
        make: options.make,
        width: options.width,
        height: options.height,
        captureDate: `2024-06-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
      })
    )
  );
}

describe(createRows, () => {
  test('packs portraits in same-kind rows of 2 or 3', () => {
    const images = photosOf(6, {
      make: 'Canon',
      width: 1000,
      height: 1500,
    });
    expect(createRows(images, 1).every((row) => row.columns === 1)).toBe(true);
    expect(
      createRows(images, 2).every(
        (row) => row.columns <= 2 && row.kind === 'portrait'
      )
    ).toBe(true);
    expect(createRows(images, 3).some((row) => row.columns === 3)).toBe(true);
  });

  test('keeps landscapes alone and does not mix kinds in a row', () => {
    const images = [
      ...photosOf(1, {
        make: 'Canon',
        width: 2000,
        height: 1000,
        namePrefix: 'l',
      }),
      ...photosOf(2, {
        make: 'Canon',
        width: 1000,
        height: 1500,
        namePrefix: 'p',
      }),
      ...photosOf(2, {
        make: 'Canon',
        width: 1000,
        height: 1000,
        namePrefix: 's',
      }),
    ];
    const rows = createRows(images, 3);
    expect(
      rows
        .filter((row) => row.kind === 'landscape')
        .every((row) => row.columns === 1)
    ).toBe(true);
    expect(
      rows.every((row) => row.images.every((image) => image.kind === row.kind))
    ).toBe(true);
  });

  test('packs Scan_ fun photos together regardless of aspect ratio', () => {
    const images = recordsToImages([
      record({
        filename: 'Scan_l.jpg',
        width: 2000,
        height: 1000,
        rating: 0,
        captureDate: '2024-06-01T12:00:00.000Z',
      }),
      record({
        filename: 'Scan_p.jpg',
        width: 1000,
        height: 1500,
        rating: 3,
        captureDate: '2024-06-02T12:00:00.000Z',
      }),
      record({
        filename: 'Scan_s.jpg',
        width: 1000,
        height: 1000,
        rating: 4,
        captureDate: '2024-06-03T12:00:00.000Z',
      }),
    ]);
    expect(images.every((image) => image.kind === 'fun')).toBe(true);
    const rows = createRows(images, 3);
    expect(rows).toHaveLength(1);
    expect(rows[0].columns).toBe(3);
    expect(rows[0].kind).toBe('fun');
  });

  test('yearly galleries do not merge leftover singles more than five days apart', () => {
    const images = recordsToImages([
      record({
        filename: 'jan.jpg',
        make: 'Canon',
        width: 1000,
        height: 1500,
        captureDate: '2024-01-01T12:00:00.000Z',
      }),
      record({
        filename: 'aug.jpg',
        make: 'Canon',
        width: 1000,
        height: 1500,
        captureDate: '2024-08-01T12:00:00.000Z',
      }),
    ]);
    const rows = createRows(images, 3, { limitDayGap: true });
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.columns === 1)).toBe(true);
  });

  test('city and series galleries ignore the five-day gap', () => {
    const images = recordsToImages([
      record({
        filename: 'jan.jpg',
        make: 'Canon',
        width: 1000,
        height: 1500,
        captureDate: '2024-01-01T12:00:00.000Z',
      }),
      record({
        filename: 'aug.jpg',
        make: 'Canon',
        width: 1000,
        height: 1500,
        captureDate: '2024-08-01T12:00:00.000Z',
      }),
    ]);
    const rows = createRows(images, 3);
    expect(rows).toHaveLength(1);
    expect(rows[0].columns).toBe(2);
  });
});
