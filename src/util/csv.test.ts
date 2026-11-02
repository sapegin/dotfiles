import { describe, expect, test } from 'vitest';
import { parseCsv, parseCsvRecord, parseCsvRecords } from './csv.ts';

describe(parseCsvRecord, () => {
  test('splits plain and quoted fields', () => {
    expect(parseCsvRecord('a,b,c')).toStrictEqual(['a', 'b', 'c']);
    expect(
      parseCsvRecord('"Declutter closets, donate clothes",Cleaning,,')
    ).toStrictEqual(['Declutter closets, donate clothes', 'Cleaning', '', '']);
    expect(parseCsvRecord('"say ""hi""",x')).toStrictEqual(['say "hi"', 'x']);
  });
});

describe(parseCsvRecords, () => {
  test('maps rows by header', () => {
    const csv = [
      'Chore,Frequency,Owner,Start',
      'Vacuum,Weekly,Raccoon,',
      '"Deep clean","Every 3 months",Possum,"October 2, 2026"',
    ].join('\n');

    expect(parseCsv(csv)).toHaveLength(3);
    expect(parseCsvRecords(csv)).toStrictEqual([
      {
        Chore: 'Vacuum',
        Frequency: 'Weekly',
        Owner: 'Raccoon',
        Start: '',
      },
      {
        Chore: 'Deep clean',
        Frequency: 'Every 3 months',
        Owner: 'Possum',
        Start: 'October 2, 2026',
      },
    ]);
  });
});
