// Sync Junkyard calendar note sections and Notion house chores to a Fastmail
// CalDAV calendar.
//
// Events the script created earlier but that are no longer in either source are
// removed from the remote calendar.
//
// Setup:
//
// - In Fastmail, create a calendar whose name matches `_fastmail-calendar`
//   below (for example “Junkyard”).
// - Create an app password (Settings → Privacy & Security → App passwords)
//   for CalDAV.
// - Add frontmatter to `Life/Junkyard calendar.md`:
//
//   _fastmail-email: you@fastmail.com
//   _fastmail-app-pass: …app password…
//   _fastmail-calendar: Junkyard
//
// - To share with others (Google Calendar, Apple, etc.), publish the Fastmail
//   calendar: Settings → Calendars → Edit & share → Publish → Full event
//   details, then subscribe to the ICS URL in the other app (read-only feed).
//
// - Use `### Month D — Title` for yearly events or `### Monday — Title` for
//   weekly events. Body text becomes the event description.
//
// - For chores: edit the Notion database, then Export → CSV and overwrite
//   `~/cloud/Documents/chores.zip`. Rows without Start or with an unsupported
//   Frequency are skipped.
//
// - Preview without writing to Fastmail:
//
// `calendar-update --dry-run`
//
// - Sync to Fastmail:
//
// `calendar-update`
//
// Both commands list each event (date and title), then report create/update/delete
// counts.
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import {
  syncCalendarEvents,
  type CalendarEventPayload,
  type CalendarEventRecurrence,
} from '../util/caldav.ts';
import { getMaslenitsaSunday } from '../util/calendar.ts';
import { parseCsvRecords } from '../util/csv.ts';
import { dirs } from '../util/files.ts';
import {
  parseFrontmatter,
  parseSections,
  wikilinksToPlainText,
} from '../util/obsidian.ts';
import { toKebabCase } from '../util/text.ts';
import { formatLocalDate } from '../util/time.ts';
import { run, UserError } from '../util/tui.ts';

const FASTMAIL_CALDAV_URL = 'https://caldav.fastmail.com/';

const CALENDAR_NOTE = path.join(
  dirs.obsidianVault,
  'Life/Junkyard calendar.md'
);

/** Notion database export (`Export` → CSV → zip). */
const CHORES_ZIP = path.join(dirs.iCloudDocuments, 'chores.zip');

const EVENT_PREFIX_FAMILY = '🌮';
const EVENT_PREFIX_BIRTHDAY = '🎂';
const EVENT_PREFIX_CHORE = '🧻';

const FREQUENCY_TO_RECURRENCE = {
  Weekly: 'weekly',
  Biweekly: 'biweekly',
  Monthly: 'monthly',
  'Every 3 months': 'every-3-months',
  'Every 6 months': 'every-6-months',
  Yearly: 'yearly',
} as const satisfies Record<string, CalendarEventRecurrence>;

/** Stable per event; changing slug/date rules creates new UIDs, not updates. */
const UID_DOMAIN = 'calendar-update.sapegin.local';

/**
 * Yearly fixed events use this DTSTART anchor (`RRULE:FREQ=YEARLY`; only
 * month/day matter). Maslenitsa instances are generated from this year through
 * current year + 5 so past years stay on the calendar and are not pruned.
 */
const JUNKYARD_CALENDAR_START_YEAR = 2021;

/**
 * Junkyard calendar H3 titles:
 *
 * - `Month D — Event name` → yearly all-day (`RRULE:FREQ=YEARLY`)
 * - `Monday — Trash night` → weekly all-day (`RRULE:FREQ=WEEKLY`)
 *
 * Date form is tried first (`Date.parse` on the date + anchor year); otherwise
 * a leading English weekday name selects weekly recurrence.
 */
const FIXED_HEADING = /^(?<date>[A-Za-z]+\s+\d{1,2})\s+[—–-]\s+(?<title>.+)$/u;

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const WEEKLY_HEADING = new RegExp(
  `^(?<weekday>${WEEKDAYS.join('|')})\\s+[—–-]\\s+(?<title>.+)$`,
  'iu'
);

const WEEKDAY_START: Temporal.PlainDate[] = WEEKDAYS.map((_, index) => {
  let date = Temporal.PlainDate.from({
    year: JUNKYARD_CALENDAR_START_YEAR,
    month: 1,
    day: 1,
  });
  while (date.dayOfWeek !== index + 1) {
    date = date.add({ days: 1 });
  }
  return date;
});

const OPTIONS = [{ name: 'dry-run', type: 'boolean', default: false }] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

interface CalendarUpdateFrontmatter {
  '_fastmail-app-pass'?: string;
  '_fastmail-email'?: string;
  '_fastmail-calendar'?: string;
}

function uidForFixedEvent(start: Temporal.PlainDate, title: string): string {
  const slug = toKebabCase(title);
  const month = String(start.month).padStart(2, '0');
  const day = String(start.day).padStart(2, '0');
  return `junkyard-${month}-${day}-${slug}@${UID_DOMAIN}`;
}

function uidForMaslenitsa(year: number): string {
  return `junkyard-maslenitsa-${year}@${UID_DOMAIN}`;
}

interface ParsedEventHeading {
  start: Temporal.PlainDate;
  title: string;
  recurrence: 'yearly' | 'weekly';
}

function parseEventHeading(heading: string): ParsedEventHeading | undefined {
  const fixed = heading.match(FIXED_HEADING);
  if (fixed?.groups !== undefined) {
    const parsed = Date.parse(
      `${fixed.groups.date}, ${JUNKYARD_CALENDAR_START_YEAR}`
    );
    if (!Number.isNaN(parsed)) {
      return {
        start: Temporal.PlainDate.from(formatLocalDate(new Date(parsed))),
        title: fixed.groups.title.trim(),
        recurrence: 'yearly',
      };
    }
  }

  const weekly = heading.match(WEEKLY_HEADING);
  const weeklyGroups = weekly?.groups;
  if (weeklyGroups !== undefined) {
    const index = WEEKDAYS.findIndex(
      (day) => day.toLowerCase() === weeklyGroups.weekday.toLowerCase()
    );
    if (index === -1) {
      return undefined;
    }
    return {
      start: WEEKDAY_START[index],
      title: weeklyGroups.title.trim(),
      recurrence: 'weekly',
    };
  }

  return undefined;
}

export function buildDesiredEvents(
  sections: ReadonlyMap<string, string>
): CalendarEventPayload[] {
  const currentYear = new Date().getFullYear();
  const events: CalendarEventPayload[] = [];

  for (const [heading, body] of sections) {
    if (heading.toLowerCase() === 'maslenitsa') {
      for (
        let year = JUNKYARD_CALENDAR_START_YEAR;
        year <= currentYear + 5;
        year++
      ) {
        const start = getMaslenitsaSunday(year);
        events.push({
          uid: uidForMaslenitsa(year),
          summary: `${EVENT_PREFIX_FAMILY} Maslenitsa`,
          description: wikilinksToPlainText(body),
          start,
          recurrence: 'none',
        });
      }
      continue;
    }

    const parsed = parseEventHeading(heading);
    if (parsed === undefined) {
      continue;
    }

    let uid: string;
    if (parsed.recurrence === 'weekly') {
      const weekdayLabel = WEEKDAYS.at(parsed.start.dayOfWeek - 1);
      if (weekdayLabel === undefined) {
        continue;
      }
      uid = `junkyard-weekly-${toKebabCase(weekdayLabel)}-${toKebabCase(parsed.title)}@${UID_DOMAIN}`;
    } else {
      uid = uidForFixedEvent(parsed.start, parsed.title);
    }

    const prefix = /\bbirthday\b/i.test(parsed.title)
      ? EVENT_PREFIX_BIRTHDAY
      : EVENT_PREFIX_FAMILY;
    events.push({
      uid,
      summary: `${prefix} ${parsed.title}`,
      description: wikilinksToPlainText(body),
      start: parsed.start,
      recurrence: parsed.recurrence,
    });
  }

  return events;
}

function getRecurrenceForFrequency(
  frequency: string
): CalendarEventRecurrence | undefined {
  if (Object.hasOwn(FREQUENCY_TO_RECURRENCE, frequency)) {
    return FREQUENCY_TO_RECURRENCE[
      frequency as keyof typeof FREQUENCY_TO_RECURRENCE
    ];
  }
  return undefined;
}

function parseChoreStart(value: string): Temporal.PlainDate | undefined {
  const trimmed = value.trim();
  if (trimmed === '') {
    return undefined;
  }
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return Temporal.PlainDate.from(formatLocalDate(new Date(parsed)));
}

/** Build CalDAV events from a Notion chores CSV export. */
export function buildChoreEvents(
  records: readonly Record<string, string>[]
): CalendarEventPayload[] {
  const events: CalendarEventPayload[] = [];

  for (const record of records) {
    const chore = record['Chore']?.trim() || '';
    const owner = record['Owner']?.trim() || '';
    const frequency = record['Frequency']?.trim() || '';
    const details = record['Details']?.trim() || '';
    const start = parseChoreStart(record['Start'] || '');
    const recurrence = getRecurrenceForFrequency(frequency);

    if (chore === '' || start === undefined || recurrence === undefined) {
      continue;
    }

    const descriptionParts = [
      owner === '' ? undefined : `Owner: ${owner}`,
      details === '' ? undefined : details,
    ].filter((part) => part !== undefined);

    events.push({
      uid: `chore-${toKebabCase(chore)}@${UID_DOMAIN}`,
      summary: `${EVENT_PREFIX_CHORE} ${chore}`,
      description: descriptionParts.join('\n'),
      start,
      recurrence,
    });
  }

  return events;
}

/** Read the primary CSV entry from a Notion database export zip. */
export function readChoresCsvFromZip(zipPath: string): string {
  let listing: string;
  try {
    listing = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' });
  } catch {
    throw new UserError(`Cannot read chores export: ${zipPath}`);
  }

  const entry = listing
    .split('\n')
    .map((line) => line.trim())
    .find((name) => name.endsWith('.csv') && !name.includes('_all'));

  if (entry === undefined) {
    throw new UserError(`No chores CSV found in ${zipPath}`);
  }

  try {
    return execFileSync('unzip', ['-p', zipPath, entry], { encoding: 'utf8' });
  } catch {
    throw new UserError(`Cannot extract ${entry} from ${zipPath}`);
  }
}

export function formatEventLine(event: CalendarEventPayload): string {
  return `${event.start.toString()}  ${event.summary}`;
}

function sortEventsForDisplay(
  events: readonly CalendarEventPayload[]
): CalendarEventPayload[] {
  return events.toSorted((a, b) =>
    Temporal.PlainDate.compare(a.start, b.start)
  );
}

function readSyncConfig(frontmatter: CalendarUpdateFrontmatter): {
  password: string;
  email: string;
  calendarName: string;
} {
  const password = frontmatter['_fastmail-app-pass']?.trim();
  const email = frontmatter['_fastmail-email']?.trim();
  const calendarName = frontmatter['_fastmail-calendar']?.trim();

  const missing: string[] = [];
  if (password === undefined || password === '') {
    missing.push('_fastmail-app-pass');
  }
  if (email === undefined || email === '') {
    missing.push('_fastmail-email');
  }
  if (calendarName === undefined || calendarName === '') {
    missing.push('_fastmail-calendar');
  }

  if (missing.length > 0) {
    throw new UserError(
      `Missing frontmatter in ${CALENDAR_NOTE}: ${missing.join(', ')}`
    );
  }

  return {
    password: password as string,
    email: email as string,
    calendarName: calendarName as string,
  };
}

/** Sync Junkyard note + Notion chores events to Fastmail. */
export async function calendarUpdate(options: Options): Promise<void> {
  const rawMarkdown = await fs.readFile(CALENDAR_NOTE, 'utf8');
  const { frontmatter, body } =
    parseFrontmatter<CalendarUpdateFrontmatter>(rawMarkdown);
  const config = readSyncConfig(frontmatter);

  const sections = parseSections(body, 3);
  const noteEvents = buildDesiredEvents(sections);
  const choreEvents = buildChoreEvents(
    parseCsvRecords(readChoresCsvFromZip(CHORES_ZIP))
  );
  const events = [...noteEvents, ...choreEvents];

  const result = await syncCalendarEvents({
    credentials: {
      serverUrl: FASTMAIL_CALDAV_URL,
      username: config.email,
      password: config.password,
    },
    calendarDisplayName: config.calendarName,
    events,
    ownedUidSuffix: `@${UID_DOMAIN}`,
    dryRun: options['dry-run'],
  });

  for (const event of sortEventsForDisplay(events)) {
    console.log(formatEventLine(event));
  }
  console.log('');

  const mode = options['dry-run'] ? 'Dry run' : 'Sync';
  console.log(
    `${mode}: ${result.created} created, ${result.updated} updated, ${result.deleted} deleted, ${result.unchanged} unchanged (${noteEvents.length} note + ${choreEvents.length} chores).`
  );
}

await run(import.meta.url, () => calendarUpdate(parseArgs(OPTIONS)));
