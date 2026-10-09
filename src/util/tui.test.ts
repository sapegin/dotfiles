import { expect, test } from 'vitest';
import { getMissingBinaryMessage, UserError } from './tui.ts';

test('userError is an Error with a stable name', () => {
  const error = new UserError('Unknown app: foo');
  expect(error).toBeInstanceOf(Error);
  expect(error).toBeInstanceOf(UserError);
  expect(error.name).toBe('UserError');
  expect(error.message).toBe('Unknown app: foo');
});

test('getMissingBinaryMessage matches spawn ENOENT only', () => {
  const spawnError = {
    code: 'ENOENT',
    syscall:
      'spawnSync /Applications/translateLocally.app/Contents/MacOS/translateLocally ENOENT',
    path: '/Applications/translateLocally.app/Contents/MacOS/translateLocally',
  } as NodeJS.ErrnoException;

  expect(getMissingBinaryMessage(spawnError)).toBe(
    'translateLocally is not installed'
  );

  expect(
    getMissingBinaryMessage({
      code: 'ENOENT',
      syscall: 'open',
      path: '/Users/me/config.json',
    } as NodeJS.ErrnoException)
  ).toBeUndefined();
});

test('getMissingBinaryMessage uses the executable basename from syscall', () => {
  expect(
    getMissingBinaryMessage({
      code: 'ENOENT',
      syscall: 'spawnSync gh ENOENT',
      path: '/opt/homebrew/bin/gh',
    } as NodeJS.ErrnoException)
  ).toBe('gh is not installed');
});
