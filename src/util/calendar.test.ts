import { describe, expect, test } from 'vitest';
import { getMaslenitsaSunday, getOrthodoxPaschaSunday } from './calendar.ts';

describe(getOrthodoxPaschaSunday, () => {
  test('matches known Orthodox Easter dates', () => {
    expect(getOrthodoxPaschaSunday(2024).toString()).toBe('2024-05-05');
    expect(getOrthodoxPaschaSunday(2025).toString()).toBe('2025-04-20');
    expect(getOrthodoxPaschaSunday(2026).toString()).toBe('2026-04-12');
  });
});

describe(getMaslenitsaSunday, () => {
  test('is the Sunday 49 days before Pascha', () => {
    expect(getMaslenitsaSunday(2025).toString()).toBe('2025-03-02');
  });
});
