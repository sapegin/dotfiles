/**
 * CalDAV sync helpers used with Fastmail (`https://caldav.fastmail.com/`).
 *
 * Operational constraints learned from production use:
 *
 * - The target calendar collection must already exist in Fastmail (match by
 *   display name). This layer does not create calendars.
 * - Ownership is inferred from the VEVENT `UID` suffix (`ownedUidSuffix`). Custom
 *   `X-*` properties are not reliable on GET, so do not depend on them for
 *   matching or pruning.
 * - Fastmail rewrites stored ICS (extra parameters on `DTSTART`, folded long
 *   lines, optional `CREATED` / `LAST-MODIFIED`, and so on). A byte-for-byte
 *   compare with freshly built ICS will report spurious updates every run.
 * - Use `veventContentFingerprint()` for equality; it unfolds lines and compares
 *   normalized schedule and text only.
 * - For `RRULE:FREQ=YEARLY` events, compare month and day on `DTSTART` only; the
 *   anchor year in the stored event may differ from the year we write.
 * - Omit empty `DESCRIPTION` lines when building ICS; Fastmail often drops them
 *   on the way back, which would otherwise look like a diff.
 */
import {
  createDAVClient,
  type DAVCalendar,
  type DAVCalendarObject,
} from 'tsdav';
import { formatIcsDate, formatIcsTimestamp } from './time.ts';

export interface CalDavCredentials {
  readonly serverUrl: string;
  readonly username: string;
  readonly password: string;
}

export interface CalendarEventPayload {
  readonly uid: string;
  readonly summary: string;
  readonly description: string;
  readonly start: Temporal.PlainDate;
  readonly yearly: boolean;
}

export interface SyncCalendarEventsOptions {
  readonly credentials: CalDavCredentials;
  readonly calendarDisplayName: string;
  readonly events: readonly CalendarEventPayload[];
  /**
   * Remote VEVENTs whose UID ends with this suffix are owned by the sync
   * (match, update, prune).
   */
  readonly ownedUidSuffix: string;
  readonly dryRun: boolean;
}

export interface SyncCalendarEventsResult {
  readonly created: number;
  readonly updated: number;
  readonly deleted: number;
  readonly unchanged: number;
}

type CalDavClient = Awaited<ReturnType<typeof createDAVClient>>;

function escapeIcsText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,');
}

/** Build a single-event iCalendar document for CalDAV PUT/POST. */
export function buildCalendarObjectIcs(
  event: CalendarEventPayload,
  now = new Date()
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//dotfiles//calendar-update//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatIcsTimestamp(now)}`,
    `DTSTART;VALUE=DATE:${formatIcsDate(event.start)}`,
  ];

  if (event.yearly) {
    lines.push('RRULE:FREQ=YEARLY');
  }

  lines.push(`SUMMARY:${escapeIcsText(event.summary)}`);
  // See module comment: empty DESCRIPTION often absent after Fastmail round-trip.
  if (event.description !== '') {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

function filenameForUid(uid: string): string {
  const safe = uid.replaceAll(/[^a-zA-Z0-9@._-]+/g, '-');
  return `${safe}.ics`;
}

/** RFC 5545 line folding: continuation lines begin with SPACE or TAB. */
function unfoldIcsLines(icsData: string): string {
  return icsData.replaceAll('\r\n', '\n').replaceAll(/\n[ \t]/g, '');
}

function extractUid(icsData: string): string | undefined {
  const unfolded = unfoldIcsLines(icsData);
  const match = unfolded.match(/^UID:([^\n\r]+)/m);
  return match?.[1]?.trim();
}

function unescapeIcsPropertyValue(value: string): string {
  return value
    .replaceAll('\\n', '\n')
    .replaceAll('\\,', ',')
    .replaceAll('\\;', ';')
    .replaceAll('\\\\', '\\');
}

function icsPropertyValue(line: string): string {
  const index = line.indexOf(':');
  if (index === -1) {
    return '';
  }
  return unescapeIcsPropertyValue(line.slice(index + 1));
}

function isYearlyEvent(icsData: string): boolean {
  return /^RRULE[^\n]*FREQ=YEARLY/m.test(unfoldIcsLines(icsData));
}

const CONTENT_PROPERTY_NAMES = [
  'DTSTART',
  'RRULE',
  'SUMMARY',
  'DESCRIPTION',
] as const;

/**
 * Fingerprint for “is this the same event?” checks against Fastmail’s stored
 * ICS.
 *
 * Ignores `DTSTAMP` and other metadata. Normalizes `DTSTART` (including
 * `;TZID=…;VALUE=DATE`), collapses yearly events to MMDD, unescapes `SUMMARY` /
 * `DESCRIPTION`, and treats missing empty description as equal.
 */
export function veventContentFingerprint(icsData: string): string {
  const yearlyEvent = isYearlyEvent(icsData);
  const unfolded = unfoldIcsLines(icsData);
  const properties: string[] = [];

  for (const line of unfolded.split('\n')) {
    for (const name of CONTENT_PROPERTY_NAMES) {
      if (!line.startsWith(`${name}:`) && !line.startsWith(`${name};`)) {
        continue;
      }

      if (line.startsWith('DTSTART')) {
        const dateMatch = line.match(/(\d{8})/);
        if (dateMatch !== null) {
          const ymd = dateMatch[1];
          properties.push(
            yearlyEvent
              ? `DTSTART;VALUE=DATE:${ymd.slice(4)}`
              : `DTSTART;VALUE=DATE:${ymd}`
          );
        }
        break;
      }

      if (line.startsWith('RRULE')) {
        properties.push(
          line.includes('FREQ=YEARLY') ? 'RRULE:FREQ=YEARLY' : line
        );
        break;
      }

      if (line.startsWith('SUMMARY')) {
        properties.push(`SUMMARY:${icsPropertyValue(line)}`);
        break;
      }

      if (line.startsWith('DESCRIPTION')) {
        const value = icsPropertyValue(line);
        if (value !== '') {
          properties.push(`DESCRIPTION:${value}`);
        }
        break;
      }
    }
  }

  return properties.toSorted().join('\n');
}

function connectClient(credentials: CalDavCredentials): Promise<CalDavClient> {
  return createDAVClient({
    serverUrl: credentials.serverUrl,
    credentials: {
      username: credentials.username,
      password: credentials.password,
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });
}

function readCalendarDisplayName(calendar: DAVCalendar): string {
  const name = calendar.displayName;
  return typeof name === 'string' ? name.trim() : '';
}

function findCalendarByDisplayName(
  calendars: readonly DAVCalendar[],
  displayName: string
): DAVCalendar | undefined {
  const target = displayName.trim();
  return calendars.find(
    (calendar) => readCalendarDisplayName(calendar) === target
  );
}

async function getCalendar(
  client: CalDavClient,
  displayName: string
): Promise<DAVCalendar> {
  const calendars = await client.fetchCalendars();
  const calendar = findCalendarByDisplayName(calendars, displayName);
  if (calendar !== undefined) {
    return calendar;
  }

  throw new Error(
    `CalDAV calendar “${displayName}” not found; create it in Fastmail first.`
  );
}

/**
 * Push desired events to a named CalDAV calendar; prune stale owned events.
 *
 * Match existing objects by exact `UID` under `ownedUidSuffix`. Prune removes
 * owned remote UIDs that are no longer in `options.events`.
 */
export async function syncCalendarEvents(
  options: SyncCalendarEventsOptions
): Promise<SyncCalendarEventsResult> {
  const client = await connectClient(options.credentials);
  const calendar = await getCalendar(client, options.calendarDisplayName);

  const remoteObjects = await client.fetchCalendarObjects({ calendar });

  const managedByUid = new Map<string, DAVCalendarObject>();
  for (const object of remoteObjects) {
    const data = object.data;
    if (typeof data !== 'string') {
      continue;
    }
    const uid = extractUid(data);
    if (uid === undefined || !uid.endsWith(options.ownedUidSuffix)) {
      continue;
    }
    managedByUid.set(uid, object);
  }

  const desiredUids = new Set(options.events.map((event) => event.uid));

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let unchanged = 0;

  for (const event of options.events) {
    const ics = buildCalendarObjectIcs(event);
    const existing = managedByUid.get(event.uid);

    if (existing === undefined) {
      created++;
      if (!options.dryRun) {
        await client.createCalendarObject({
          calendar,
          iCalString: ics,
          filename: filenameForUid(event.uid),
        });
      }
      continue;
    }

    const existingData = typeof existing.data === 'string' ? existing.data : '';
    if (
      veventContentFingerprint(existingData) === veventContentFingerprint(ics)
    ) {
      unchanged++;
      continue;
    }

    updated++;
    if (!options.dryRun) {
      await client.updateCalendarObject({
        calendarObject: { ...existing, data: ics },
      });
    }
  }

  for (const [uid, object] of managedByUid) {
    if (desiredUids.has(uid)) {
      continue;
    }
    deleted++;
    if (!options.dryRun) {
      await client.deleteCalendarObject({ calendarObject: object });
    }
  }

  return { created, updated, deleted, unchanged };
}
