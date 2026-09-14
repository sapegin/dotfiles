import { describe, expect, test } from 'vitest';
import { capitalizeFirst, toKebabCase, toSentenceCase } from './text.ts';

describe(capitalizeFirst, () => {
  test('capitalizes only the first character', () => {
    expect(capitalizeFirst('my note')).toBe('My note');
    expect(capitalizeFirst('My Note')).toBe('My Note');
  });
});

describe(toKebabCase, () => {
  test('lowercases words and joins them with dashes', () => {
    expect(toKebabCase('Foo Bar')).toBe('foo-bar');
  });
});

describe(toSentenceCase, () => {
  test('capitalizes only the first character', () => {
    expect(toSentenceCase('Marriage Registration Existence Certificate')).toBe(
      'Marriage registration existence certificate'
    );
    expect(toSentenceCase('Payslip 2026-04')).toBe('Payslip 2026-04');
  });
});
