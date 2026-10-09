import { describe, expect, test } from 'vitest';
import { resolveMacApps } from './app-install.ts';

const RACCOON_TOOLBOX = {
  name: 'raccoon-toolbox',
  buildCommands: ['npm ci --silent', 'npm run build:app'],
  bundlePath: 'src-tauri/target/release/bundle/macos/Raccoon Toolbox.app',
};

describe(resolveMacApps, () => {
  test('returns all apps when no names are given', () => {
    expect(resolveMacApps([])).toStrictEqual([RACCOON_TOOLBOX]);
  });

  test('returns a single app by name', () => {
    expect(resolveMacApps(['raccoon-toolbox'])).toStrictEqual([
      RACCOON_TOOLBOX,
    ]);
  });

  test('throws for an unknown app name', () => {
    expect(() => resolveMacApps(['no-such-app'])).toThrow(
      'Unknown app: no-such-app'
    );
  });
});
