import { expect, test } from 'vitest';
import { isMissingBinary, missingBinaryMessage } from './tui.ts';

test('isMissingBinary matches spawn ENOENT only', () => {
  const spawnError = {
    code: 'ENOENT',
    syscall:
      'spawnSync /Applications/translateLocally.app/Contents/MacOS/translateLocally ENOENT',
    path: '/Applications/translateLocally.app/Contents/MacOS/translateLocally',
  } as NodeJS.ErrnoException;

  expect(isMissingBinary(spawnError)).toBe(true);

  expect(
    isMissingBinary({
      code: 'ENOENT',
      syscall: 'open',
      path: '/Users/me/config.json',
    } as NodeJS.ErrnoException)
  ).toBe(false);
});

test('missingBinaryMessage uses the executable basename', () => {
  expect(
    missingBinaryMessage({
      code: 'ENOENT',
      syscall: 'spawnSync gh ENOENT',
      path: '/opt/homebrew/bin/gh',
    } as NodeJS.ErrnoException)
  ).toBe('gh is not installed');
});
