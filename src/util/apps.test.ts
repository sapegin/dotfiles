import { describe, expect, test } from 'vitest';
import { killApp } from './apps.ts';

describe(killApp, () => {
  test('does not throw when the process is not running', () => {
    expect(() => killApp('DefinitelyNotARunningAppXYZ')).not.toThrow();
  });

  test('accepts an .app path and still no-ops when missing', () => {
    expect(() =>
      killApp('/Applications/DefinitelyNotARunningAppXYZ.app')
    ).not.toThrow();
  });
});
