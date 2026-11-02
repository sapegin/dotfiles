import { describe, expect, test } from 'vitest';
import { buildLaunchAgentPlist } from './launchAgent.ts';

describe(buildLaunchAgentPlist, () => {
  test('builds a daily schedule plist', () => {
    const plist = buildLaunchAgentPlist({
      label: 'me.sapegin.backup',
      program: '/usr/local/bin/backup',
      hour: 3,
      minute: 0,
      logFile: '/tmp/backup.log',
      errFile: '/tmp/backup.err',
    });

    expect(plist).toContain('<key>StartCalendarInterval</key>');
    expect(plist).not.toContain('<key>RunAtLoad</key>');
    expect(plist).toContain('<string>/usr/local/bin/backup</string>');
  });

  test('builds a run-at-login plist', () => {
    const plist = buildLaunchAgentPlist({
      label: 'me.sapegin.hotdog',
      programArguments: ['/usr/bin/open', '-a', '/Applications/Hotdog.app'],
      runAtLoad: true,
    });

    expect(plist).toContain('<key>RunAtLoad</key>');
    expect(plist).toContain('<key>LimitLoadToSessionType</key>');
    expect(plist).not.toContain('<key>StartCalendarInterval</key>');
    expect(plist).not.toContain('<key>StandardOutPath</key>');
  });
});
