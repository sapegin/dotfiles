import { describe, expect, test } from 'vitest';
import { parseExifDateParts } from './exif.ts';
import {
  type DateParts,
  formatLocalDate,
  formatLocalDateTime,
  formatLocalTimestamp,
  formatLocalHour,
  getPhotoTimezoneShiftMinutes,
  parseLocalDateTime,
} from './time.ts';

function parseDateParts(value: string): DateParts {
  const parts = parseExifDateParts(value);
  if (parts === undefined) {
    throw new Error(`Invalid test EXIF date: ${value}`);
  }
  return parts;
}

describe(formatLocalDate, () => {
  test('formats local date as YYYY-MM-DD', () => {
    expect(formatLocalDate(new Date(2026, 6, 5, 9, 8))).toBe('2026-07-05');
  });
});

describe(formatLocalDateTime, () => {
  test('formats local date and time as YYYY-MM-DD_HHmm', () => {
    expect(formatLocalDateTime(new Date(2026, 6, 5, 9, 8))).toBe(
      '2026-07-05_0908'
    );
  });
});

describe(formatLocalTimestamp, () => {
  test('formats local date and time as YYYY-MM-DD HH:mm:ss', () => {
    expect(formatLocalTimestamp(new Date(2026, 6, 5, 9, 8))).toBe(
      '2026-07-05 09:08:00'
    );
  });
});

describe(formatLocalHour, () => {
  test('formats local hour as HH', () => {
    expect(formatLocalHour(new Date(2026, 6, 5, 9, 8))).toBe('09');
  });
});

describe(parseLocalDateTime, () => {
  test('parses local date and time from YYYY-MM-DD_HHmm', () => {
    expect(parseLocalDateTime('2026-07-05_0908')).toStrictEqual(
      new Date(2026, 6, 5, 9, 8)
    );
  });

  test('rejects unknown date time formats', () => {
    expect(parseLocalDateTime('2026-07-05 09:08')).toBeUndefined();
  });
});

describe(parseExifDateParts, () => {
  test('parses an EXIF date time', () => {
    expect(parseExifDateParts('2026:07:05 14:30:12')).toStrictEqual({
      year: 2026,
      month: 7,
      day: 5,
      hour: 14,
      minute: 30,
      second: 12,
    });
  });

  test('rejects unknown date formats', () => {
    expect(parseExifDateParts('2026-07-05 14:30:12')).toBeUndefined();
  });
});

describe(getPhotoTimezoneShiftMinutes, () => {
  test('uses the winter offset for each photo date', () => {
    expect(
      getPhotoTimezoneShiftMinutes(
        parseDateParts('2026:01:15 12:00:00'),
        'Asia/Tokyo'
      )
    ).toBe(8 * 60);
  });

  test('uses the summer offset for each photo date', () => {
    expect(
      getPhotoTimezoneShiftMinutes(
        parseDateParts('2026:07:15 12:00:00'),
        'Asia/Tokyo'
      )
    ).toBe(7 * 60);
  });

  test('handles target timezones with a previous-day wall time', () => {
    expect(
      getPhotoTimezoneShiftMinutes(
        parseDateParts('2026:07:15 02:00:00'),
        'America/Los_Angeles'
      )
    ).toBe(-9 * 60);
  });
});
