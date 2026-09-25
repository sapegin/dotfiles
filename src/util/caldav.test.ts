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
        yearly: true,
      },
      new Date('2026-01-01T12:00:00.000Z')
    );

    expect(ics).toContain('UID:test@example.com');
    expect(ics).toContain('DTSTART;VALUE=DATE:20210512');
    expect(ics).toContain('RRULE:FREQ=YEARLY');
    expect(ics).toContain('SUMMARY:Birthday');
  });
});

describe(veventContentFingerprint, () => {
  test('normalizes DTSTART parameters to VALUE=DATE', () => {
    const local = buildCalendarObjectIcs({
      uid: 'a@b',
      summary: 'Maslenitsa',
      description: 'Food',
      start: Temporal.PlainDate.from({ year: 2026, month: 3, day: 2 }),
      yearly: false,
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
      yearly: true,
    });
    const y2000 =
      'BEGIN:VEVENT\nUID:a@b\nDTSTART;VALUE=DATE:20000113\nRRULE:FREQ=YEARLY\nSUMMARY:Pati birthday\nEND:VEVENT';
    expect(veventContentFingerprint(y2021)).toBe(
      veventContentFingerprint(y2000)
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
