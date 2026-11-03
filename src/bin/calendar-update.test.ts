import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  buildChoreEvents,
  buildDesiredEvents,
  formatEventLine,
  readChoresCsvFromZip,
} from './calendar-update.ts';

describe(formatEventLine, () => {
  test('formats yearly and fixed dates', () => {
    expect(
      formatEventLine({
        uid: 'a',
        summary: '🎂 Pati birthday',
        description: '',
        start: Temporal.PlainDate.from({ year: 2021, month: 1, day: 13 }),
        recurrence: 'yearly',
      })
    ).toBe('2021-01-13  🎂 Pati birthday');
    expect(
      formatEventLine({
        uid: 'b',
        summary: '🌮 Maslenitsa',
        description: '',
        start: Temporal.PlainDate.from({ year: 2026, month: 3, day: 2 }),
        recurrence: 'none',
      })
    ).toBe('2026-03-02  🌮 Maslenitsa');
  });
});

describe(buildDesiredEvents, () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 0, 1) });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('builds fixed yearly events and Maslenitsa instances', () => {
    const sections = new Map([
      ['January 13 — Pati birthday', '???'],
      ['Maslenitsa', 'Dishes: [[Blini]]'],
    ]);

    const events = buildDesiredEvents(sections);

    expect(events).toHaveLength(12);
    expect(events[0]).toMatchObject({
      summary: '🎂 Pati birthday',
      recurrence: 'yearly',
      start: Temporal.PlainDate.from({ year: 2021, month: 1, day: 13 }),
    });
    const maslenitsa2026 = events.find(
      (event) =>
        event.uid === 'junkyard-maslenitsa-2026@calendar-update.sapegin.local'
    );
    expect(maslenitsa2026).toMatchObject({
      summary: '🌮 Maslenitsa',
      recurrence: 'none',
    });
    expect(maslenitsa2026?.description).toContain('Dishes: Blini');
  });

  test('builds weekly events from weekday headings', () => {
    const sections = new Map([
      ['Monday — Trash night', 'Bins out'],
      ['friday — Pub', ''],
    ]);

    const events = buildDesiredEvents(sections);

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      summary: '🌮 Trash night',
      recurrence: 'weekly',
      uid: 'junkyard-weekly-monday-trash-night@calendar-update.sapegin.local',
      start: Temporal.PlainDate.from({ year: 2021, month: 1, day: 4 }),
    });
    expect(events[0]?.description).toBe('Bins out');
    expect(events[1]).toMatchObject({
      summary: '🌮 Pub',
      recurrence: 'weekly',
      uid: 'junkyard-weekly-friday-pub@calendar-update.sapegin.local',
    });
  });

  test('skips headings without a title or date', () => {
    const sections = new Map([
      ['Maslenitsa', ''],
      ['May 4', '???'],
      ['Not a date — Title', ''],
    ]);

    const events = buildDesiredEvents(sections);

    expect(events).toHaveLength(11);
    expect(events.every((event) => event.summary === '🌮 Maslenitsa')).toBe(
      true
    );
  });
});

describe(buildChoreEvents, () => {
  test('builds chores with start dates and skips daily/empty start', () => {
    const events = buildChoreEvents([
      {
        Chore: 'Deep clean kitchen surfaces',
        Area: 'Kitchen',
        Details: 'Includes shelves, and inside microwave',
        Frequency: 'Every 3 months',
        Owner: 'Possum',
        Start: 'October 2, 2026',
      },
      {
        Chore: 'Kitchen night routine',
        Frequency: 'Daily',
        Owner: 'Raccoon',
        Start: 'October 2, 2026',
        Details: '',
      },
      {
        Chore: 'Vacuum',
        Frequency: 'Weekly',
        Owner: 'Raccoon',
        Start: '',
        Details: '',
      },
      {
        Chore: 'Clean air fryer',
        Frequency: 'Biweekly',
        Owner: 'Raccoon',
        Start: 'October 2, 2026',
        Details: '',
      },
    ]);

    expect(events).toStrictEqual([
      {
        uid: 'chore-deep-clean-kitchen-surfaces@calendar-update.sapegin.local',
        summary: '🧻 Deep clean kitchen surfaces',
        description: 'Owner: Possum\nIncludes shelves, and inside microwave',
        start: Temporal.PlainDate.from({ year: 2026, month: 10, day: 2 }),
        recurrence: 'every-3-months',
      },
      {
        uid: 'chore-clean-air-fryer@calendar-update.sapegin.local',
        summary: '🧻 Clean air fryer',
        description: 'Owner: Raccoon',
        start: Temporal.PlainDate.from({ year: 2026, month: 10, day: 2 }),
        recurrence: 'biweekly',
      },
    ]);
  });
});

describe(readChoresCsvFromZip, () => {
  test('reads the primary CSV entry from a Notion-style zip', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chores-zip-'));
    const csvName = 'Chores 40bb68e0.csv';
    fs.writeFileSync(
      path.join(directory, csvName),
      'Chore,Frequency,Owner,Start\nVacuum,Weekly,Raccoon,\n'
    );
    fs.writeFileSync(
      path.join(directory, 'Chores 40bb68e0_all.csv'),
      'ignored'
    );
    const zipPath = path.join(directory, 'chores.zip');
    execFileSync('zip', ['-q', zipPath, csvName, 'Chores 40bb68e0_all.csv'], {
      cwd: directory,
    });

    const csv = readChoresCsvFromZip(zipPath);
    expect(csv).toContain('Chore,Frequency,Owner,Start');
    expect(csv).toContain('Vacuum');
    expect(csv).not.toBe('ignored');
  });
});
