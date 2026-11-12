import { describe, expect, test } from 'vitest';
import { killApp, restartApp } from './apps.ts';

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

describe(restartApp, () => {
  test('resolves when the app is not running', async () => {
    await expect(
      restartApp('/Applications/DefinitelyNotARunningAppXYZ.app')
    ).resolves.toBeUndefined();
  }, 10_000);
});
