// Sync Junkyard calendar note sections to a Fastmail CalDAV calendar.
//
// Reads `Life/Junkyard calendar.md` in the Obsidian vault, turns each `###`
// section into CalDAV all-day events, and mirrors them to Fastmail. Events the
// script created earlier but that are no longer in the note are removed from
// the remote calendar.
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
// - Use `### Month D — Title` headings, such as `### January 13 — Pati
//   birthday`. Body text becomes the event description.
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

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import {
  syncCalendarEvents,
  type CalendarEventPayload,
} from '../util/caldav.ts';
import { getMaslenitsaSunday } from '../util/calendar.ts';
import { dirs } from '../util/files.ts';
import {
  parseFrontmatter,
  parseSections,
  wikilinksToPlainText,
} from '../util/obsidian.ts';
import { toKebabCase } from '../util/text.ts';
import { formatLocalDate } from '../util/time.ts';
import { run } from '../util/tui.ts';

const FASTMAIL_CALDAV_URL = 'https://caldav.fastmail.com/';

const CALENDAR_NOTE = path.join(
  dirs.obsidianVault,
  'Life/Junkyard calendar.md'
);

/** Stable per event; changing slug/date rules creates new UIDs, not updates. */
const UID_DOMAIN = 'calendar-update.sapegin.local';

/**
 * Yearly fixed events use this DTSTART anchor (`RRULE:FREQ=YEARLY`; only
 * month/day matter). Maslenitsa instances are generated from this year through
 * current year + 5 so past years stay on the calendar and are not pruned.
 */
const JUNKYARD_CALENDAR_START_YEAR = 2021;

/**
 * Junkyard calendar note H3 titles: `Month D — Event name`
 * (em dash, en dash, or hyphen between day and title).
 *
 * Examples:
 *
 * - `January 13 — Pati birthday`;
 */
const FIXED_HEADING = /^(?<date>[A-Za-z]+\s+\d{1,2})\s+[—–-]\s+(?<title>.+)$/u;

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

function parseFixedHeading(
  heading: string
): { start: Temporal.PlainDate; title: string } | undefined {
  const match = heading.match(FIXED_HEADING);
  if (match?.groups === undefined) {
    return undefined;
  }

  const parsed = Date.parse(
    `${match.groups.date}, ${JUNKYARD_CALENDAR_START_YEAR}`
  );
  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return {
    start: Temporal.PlainDate.from(formatLocalDate(new Date(parsed))),
    title: match.groups.title.trim(),
  };
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
          summary: 'Maslenitsa',
          description: wikilinksToPlainText(body),
          start,
          yearly: false,
        });
      }
      continue;
    }

    const fixed = parseFixedHeading(heading);
    if (fixed === undefined) {
      continue;
    }

    events.push({
      uid: uidForFixedEvent(fixed.start, fixed.title),
      summary: fixed.title,
      description: wikilinksToPlainText(body),
      start: fixed.start,
      yearly: true,
    });
  }

  return events;
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
    throw new Error(
      `Missing frontmatter in ${CALENDAR_NOTE}: ${missing.join(', ')}`
    );
  }

  return {
    password: password as string,
    email: email as string,
    calendarName: calendarName as string,
  };
}

/** Sync Junkyard calendar note events to Fastmail. */
export async function calendarUpdate(options: Options): Promise<void> {
  const rawMarkdown = await fs.readFile(CALENDAR_NOTE, 'utf8');
  const { frontmatter, body } =
    parseFrontmatter<CalendarUpdateFrontmatter>(rawMarkdown);
  const config = readSyncConfig(frontmatter);

  const sections = parseSections(body, 3);
  const events = buildDesiredEvents(sections);

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
    `${mode}: ${result.created} created, ${result.updated} updated, ${result.deleted} deleted, ${result.unchanged} unchanged (${events.length} events in note).`
  );
}

await run(import.meta.url, () => calendarUpdate(parseArgs(OPTIONS)));
