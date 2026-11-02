import { describe, expect, test } from 'vitest';
import {
  assertCanonicalHotdogInstall,
  HOTDOG_INSTALL_PATH,
  resolveMacApps,
} from './app-install.ts';

const RACCOON_TOOLBOX = {
  name: 'raccoon-toolbox',
  buildCommands: ['npm ci --silent', 'npm run build:app'],
  bundlePath: 'src-tauri/target/release/bundle/macos/Raccoon Toolbox.app',
};

describe(resolveMacApps, () => {
  test('returns all apps when no names are given', () => {
    expect(resolveMacApps([]).map((app) => app.name)).toStrictEqual([
      'raccoon-toolbox',
      'hotdog',
      'pastor',
    ]);
  });

  test('returns a single app by name', () => {
    expect(resolveMacApps(['raccoon-toolbox'])).toStrictEqual([
      RACCOON_TOOLBOX,
    ]);
  });

  test('resolves hotdog to raccoon-apps repo', () => {
    expect(resolveMacApps(['hotdog'])).toMatchObject([
      { name: 'hotdog', repo: 'raccoon-apps' },
    ]);
  });

  test('throws for an unknown app name', () => {
    expect(() => resolveMacApps(['no-such-app'])).toThrow(
      'Unknown app: no-such-app'
    );
  });
});

describe(assertCanonicalHotdogInstall, () => {
  test('throws when Hotdog is missing from /Applications', () => {
    expect(() => assertCanonicalHotdogInstall()).toThrow(HOTDOG_INSTALL_PATH);
  });
});
