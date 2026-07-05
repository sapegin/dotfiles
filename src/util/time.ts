const BASE_TIME_ZONE = 'Europe/Berlin';

const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

export interface DateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** Format local date as `YYYY-MM-DD`. */
export function formatLocalDate(date: Date): string {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join('-');
}

/** Format local date and time as `YYYY-MM-DD_HHmm`. */
export function formatLocalDateTime(date: Date): string {
  const time = `${pad2(date.getHours())}${pad2(date.getMinutes())}`;
  return `${formatLocalDate(date)}_${time}`;
}

/** Format local date and time as `YYYY-MM-DD HH:mm:ss`. */
export function formatLocalTimestamp(date: Date): string {
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  return `${formatLocalDate(date)} ${time}`;
}

/** Format local hour as `HH`. */
export function formatLocalHour(date: Date): string {
  return pad2(date.getHours());
}

/** Parse local date and time from `YYYY-MM-DD_HHmm`. */
export function parseLocalDateTime(value: string): Date | undefined {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})_(\d{2})(\d{2})$/);
  if (match === null) {
    return undefined;
  }

  const [, date, hour, minute] = match;
  return new Date(Date.parse(`${date}T${hour}:${minute}:00`));
}

/** Return all IANA timezone names supported by the current Node runtime. */
export function getTimeZones(): string[] {
  return Intl.supportedValuesOf('timeZone');
}

/** Reuse Intl formatter instances because timezone formatting happens often. */
function getDateTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = dateTimeFormatters.get(timeZone);
  if (cached !== undefined) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    calendar: 'iso8601',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  dateTimeFormatters.set(timeZone, formatter);
  return formatter;
}

/** Return an instant as local date parts in a target timezone. */
function getDateParts(date: Date, timeZone: string): DateParts {
  const values = new Map(
    getDateTimeFormatter(timeZone)
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );

  return {
    year: Number(values.get('year')),
    month: Number(values.get('month')),
    day: Number(values.get('day')),
    hour: Number(values.get('hour')),
    minute: Number(values.get('minute')),
    second: Number(values.get('second')),
  };
}

/** Treat date parts as a UTC timestamp for comparing wall-clock values. */
function getUtcTime(parts: DateParts): number {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
}

/** Return timezone offset in milliseconds at a specific instant. */
function getTimeZoneOffset(timeZone: string, date: Date): number {
  const localTime = getUtcTime(getDateParts(date, timeZone));
  return localTime - date.getTime();
}

/** Resolve local wall-clock parts in `timeZone` to the matching instant. */
function getInstantFromWallTime(timeZone: string, parts: DateParts): Date {
  const wallTime = getUtcTime(parts);
  let instant = wallTime - getTimeZoneOffset(timeZone, new Date(wallTime));

  // Recalculate once because the first guess may cross a DST boundary.
  instant = wallTime - getTimeZoneOffset(timeZone, new Date(instant));
  return new Date(instant);
}

/** Compute the date shift from the base camera timezone to a target timezone. */
export function getPhotoTimezoneShiftMinutes(
  dateParts: DateParts,
  targetTimeZone: string,
  baseTimeZone = BASE_TIME_ZONE
): number {
  const instant = getInstantFromWallTime(baseTimeZone, dateParts);
  const targetParts = getDateParts(instant, targetTimeZone);
  const shiftMs = getUtcTime(targetParts) - getUtcTime(dateParts);
  return Math.round(shiftMs / 60_000);
}
