import fs from 'node:fs';
import { afterEach, describe, expect, test, vi } from 'vitest';
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('throws when Hotdog is missing from /Applications', () => {
    vi.spyOn(fs, 'realpathSync').mockImplementation(() => {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    });

    expect(() => assertCanonicalHotdogInstall()).toThrow(HOTDOG_INSTALL_PATH);
  });

  test('throws when Hotdog resolves to a Debug build', () => {
    vi.spyOn(fs, 'realpathSync').mockReturnValue(
      '/tmp/raccoon-apps/build/Build/Products/Debug/Hotdog.app'
    );

    expect(() => assertCanonicalHotdogInstall()).toThrow('Debug build');
  });
});
