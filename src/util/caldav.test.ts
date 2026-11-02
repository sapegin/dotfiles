import { describe, expect, test } from 'vitest';
import { buildCalendarObjectIcs, veventContentFingerprint } from './caldav.ts';

describe(buildCalendarObjectIcs, () => {
  test('builds an all-day yearly event', () => {
    const ics = buildCalendarObjectIcs(
      {
        uid: 'test@example.com',
        summary: 'Birthday',
        description: 'Cake',
        start: Temporal.PlainDate.from({ year: 2021, month: 5, day: 12 }),
        recurrence: 'yearly',
      },
      new Date('2026-01-01T12:00:00.000Z')
    );

    expect(ics).toContain('UID:test@example.com');
    expect(ics).toContain('DTSTART;VALUE=DATE:20210512');
    expect(ics).toContain('RRULE:FREQ=YEARLY');
    expect(ics).toContain('SUMMARY:Birthday');
  });

  test('builds a weekly all-day event', () => {
    const ics = buildCalendarObjectIcs({
      uid: 'weekly@example.com',
      summary: 'Trash night',
      description: '',
      start: Temporal.PlainDate.from({ year: 2021, month: 1, day: 4 }),
      recurrence: 'weekly',
    });

    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO');
    expect(ics).toContain('DTSTART;VALUE=DATE:20210104');
  });

  test('builds biweekly and interval monthly events', () => {
    const biweekly = buildCalendarObjectIcs({
      uid: 'bi@example.com',
      summary: 'Bathroom',
      description: '',
      start: Temporal.PlainDate.from({ year: 2026, month: 10, day: 2 }),
      recurrence: 'biweekly',
    });
    expect(biweekly).toContain('RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=FR');

    const quarterly = buildCalendarObjectIcs({
      uid: 'q@example.com',
      summary: 'Oven',
      description: '',
      start: Temporal.PlainDate.from({ year: 2026, month: 10, day: 2 }),
      recurrence: 'every-3-months',
    });
    expect(quarterly).toContain('RRULE:FREQ=MONTHLY;INTERVAL=3');
  });
});

describe(veventContentFingerprint, () => {
  test('normalizes DTSTART parameters to VALUE=DATE', () => {
    const local = buildCalendarObjectIcs({
      uid: 'a@b',
      summary: 'Maslenitsa',
      description: 'Food',
      start: Temporal.PlainDate.from({ year: 2026, month: 3, day: 2 }),
      recurrence: 'none',
    });
    const remote =
      'BEGIN:VEVENT\nUID:a@b\nDTSTART;TZID=Europe/Berlin;VALUE=DATE:20260302\nSUMMARY:Maslenitsa\nDESCRIPTION:Food\nEND:VEVENT';
    expect(veventContentFingerprint(local)).toBe(
      veventContentFingerprint(remote)
    );
  });

  test('ignores DTSTART anchor year on yearly events', () => {
    const y2021 = buildCalendarObjectIcs({
      uid: 'a@b',
      summary: 'Pati birthday',
      description: '',
      start: Temporal.PlainDate.from({ year: 2021, month: 1, day: 13 }),
      recurrence: 'yearly',
    });
    const y2000 =
      'BEGIN:VEVENT\nUID:a@b\nDTSTART;VALUE=DATE:20000113\nRRULE:FREQ=YEARLY\nSUMMARY:Pati birthday\nEND:VEVENT';
    expect(veventContentFingerprint(y2021)).toBe(
      veventContentFingerprint(y2000)
    );
  });

  test('normalizes weekly RRULE with BYDAY', () => {
    const local = buildCalendarObjectIcs({
      uid: 'a@b',
      summary: 'Trash',
      description: '',
      start: Temporal.PlainDate.from({ year: 2021, month: 1, day: 4 }),
      recurrence: 'weekly',
    });
    const remote =
      'BEGIN:VEVENT\nUID:a@b\nDTSTART;VALUE=DATE:20210104\nRRULE:FREQ=WEEKLY;BYDAY=MO;WKST=SU\nSUMMARY:Trash\nEND:VEVENT';
    expect(veventContentFingerprint(local)).toBe(
      veventContentFingerprint(remote)
    );
  });

  test('keeps INTERVAL when fingerprinting biweekly RRULEs', () => {
    const local = buildCalendarObjectIcs({
      uid: 'a@b',
      summary: 'Bathroom',
      description: '',
      start: Temporal.PlainDate.from({ year: 2026, month: 10, day: 2 }),
      recurrence: 'biweekly',
    });
    const remote =
      'BEGIN:VEVENT\nUID:a@b\nDTSTART;VALUE=DATE:20261002\nRRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=FR;WKST=SU\nSUMMARY:Bathroom\nEND:VEVENT';
    expect(veventContentFingerprint(local)).toBe(
      veventContentFingerprint(remote)
    );
  });

  test('unfolds folded DESCRIPTION lines', () => {
    const folded = veventContentFingerprint(
      'BEGIN:VEVENT\nUID:a@b\nDTSTART;VALUE=DATE:20210113\nRRULE:FREQ=YEARLY\nSUMMARY:Hi\nDESCRIPTION:Long line one\n part two\nEND:VEVENT'
    );
    const plain = veventContentFingerprint(
      'BEGIN:VEVENT\nUID:a@b\nDTSTART;VALUE=DATE:20210113\nRRULE:FREQ=YEARLY\nSUMMARY:Hi\nDESCRIPTION:Long line onepart two\nEND:VEVENT'
    );
    expect(folded).toBe(plain);
  });
});
