import { describe, expect, test } from 'vitest';
import {
  parseContactsTsv,
  resolveDefaultInvitees,
  type ContactRecord,
} from './contacts.ts';

const possum: ContactRecord = {
  displayName: 'Margarita Arimatea Diaz Cortes',
  searchableName: 'Margarita Arimatea Diaz Cortes Possum',
  emails: [
    { label: '_$!<Home>!$_', value: 'wife@example.com' },
    { label: '_$!<Work>!$_', value: 'work@example.com' },
  ],
};

const janePossum: ContactRecord = {
  displayName: 'Jane Possum',
  searchableName: 'Jane Possum',
  emails: [{ label: '_$!<Home>!$_', value: 'jane@example.com' }],
};

describe(resolveDefaultInvitees, () => {
  test('resolves ContactName:label via nickname token and CN home label', () => {
    expect(resolveDefaultInvitees(['Possum:home'], [possum])).toStrictEqual({
      emails: ['wife@example.com'],
      unresolved: [],
    });
  });

  test('passes through plain emails', () => {
    expect(resolveDefaultInvitees(['artem@sapegin.me'], [])).toStrictEqual({
      emails: ['artem@sapegin.me'],
      unresolved: [],
    });
  });

  test('reports unresolved contact references', () => {
    expect(resolveDefaultInvitees(['Missing:home'], [possum])).toStrictEqual({
      emails: [],
      unresolved: ['Missing:home'],
    });
  });

  test('resolves by unique name token', () => {
    expect(resolveDefaultInvitees(['Possum:home'], [janePossum])).toStrictEqual(
      {
        emails: ['jane@example.com'],
        unresolved: [],
      }
    );
  });

  test('resolves home label via CN wrapper without localized text', () => {
    expect(
      resolveDefaultInvitees(['Jane Possum:home'], [janePossum])
    ).toStrictEqual({
      emails: ['jane@example.com'],
      unresolved: [],
    });
  });

  test('leaves ambiguous token matches unresolved', () => {
    expect(
      resolveDefaultInvitees(['Possum:home'], [possum, janePossum])
    ).toStrictEqual({
      emails: [],
      unresolved: ['Possum:home'],
    });
  });

  test('dedupes repeated contact records from overlapping loads', () => {
    expect(
      resolveDefaultInvitees(
        ['Possum:home', 'Margarita Arimatea Diaz Cortes:work'],
        [possum, possum]
      )
    ).toStrictEqual({
      emails: ['wife@example.com', 'work@example.com'],
      unresolved: [],
    });
  });
});

describe(parseContactsTsv, () => {
  test('groups emails and builds searchable names from nickname', () => {
    const tsv = [
      'Margarita\tPossum\t_$!<Home>!$_\twife@example.com',
      'Margarita\tPossum\t_$!<Work>!$_\twork@example.com',
      'Solo\tmissing value\tEmail\tsolo@example.com',
    ].join('\n');

    expect(parseContactsTsv(tsv)).toStrictEqual([
      {
        displayName: 'Margarita',
        searchableName: 'Margarita Possum',
        emails: [
          { label: '_$!<Home>!$_', value: 'wife@example.com' },
          { label: '_$!<Work>!$_', value: 'work@example.com' },
        ],
      },
      {
        displayName: 'Solo',
        searchableName: 'Solo',
        emails: [{ label: 'Email', value: 'solo@example.com' }],
      },
    ]);
  });
});
