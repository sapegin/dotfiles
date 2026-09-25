import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { buildDesiredEvents, formatEventLine } from './calendar-update.ts';

describe(formatEventLine, () => {
  test('formats yearly and fixed dates', () => {
    expect(
      formatEventLine({
        uid: 'a',
        summary: 'Pati birthday',
        description: '',
        start: Temporal.PlainDate.from({ year: 2021, month: 1, day: 13 }),
        recurrence: 'yearly',
      })
    ).toBe('2021-01-13  Pati birthday');
    expect(
      formatEventLine({
        uid: 'b',
        summary: 'Maslenitsa',
        description: '',
        start: Temporal.PlainDate.from({ year: 2026, month: 3, day: 2 }),
        recurrence: 'none',
      })
    ).toBe('2026-03-02  Maslenitsa');
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
      summary: 'Pati birthday',
      recurrence: 'yearly',
      start: Temporal.PlainDate.from({ year: 2021, month: 1, day: 13 }),
    });
    const maslenitsa2026 = events.find(
      (event) => event.uid === 'junkyard-maslenitsa-2026@calendar-update.sapegin.local'
    );
    expect(maslenitsa2026).toMatchObject({
      summary: 'Maslenitsa',
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
      summary: 'Trash night',
      recurrence: 'weekly',
      uid: 'junkyard-weekly-monday-trash-night@calendar-update.sapegin.local',
      start: Temporal.PlainDate.from({ year: 2021, month: 1, day: 4 }),
    });
    expect(events[0]?.description).toBe('Bins out');
    expect(events[1]).toMatchObject({
      summary: 'Pub',
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
    expect(events.every((event) => event.summary === 'Maslenitsa')).toBe(true);
  });
});
