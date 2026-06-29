// Install and remove macOS LaunchAgents that run a program on a daily schedule.

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { dirs } from './consts.ts';
import { log } from './theme.ts';

export interface LaunchAgentConfig {
  // Reverse-DNS identifier, e.g. `me.sapegin.backup`.
  label: string;
  // Absolute path to the executable launchd should run.
  program: string;
  // Time of day to run, in 24-hour local time.
  hour: number;
  minute: number;
  // Absolute paths for captured stdout and stderr.
  logFile: string;
  errFile: string;
}

function getPlistFilePath(label: string): string {
  return path.join(dirs.home, 'Library/LaunchAgents', `${label}.plist`);
}

function getGuiDomain(): string {
  const uid = process.getuid?.();
  if (uid === undefined) {
    throw new Error('Cannot determine the current user id');
  }
  return `gui/${uid}`;
}

function buildPlist(config: LaunchAgentConfig): string {
  // launchd does not expand `~`, so every path must be absolute.
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>Label</key>
\t<string>${config.label}</string>
\t<key>ProgramArguments</key>
\t<array>
\t\t<string>${config.program}</string>
\t</array>
\t<key>StartCalendarInterval</key>
\t<dict>
\t\t<key>Hour</key>
\t\t<integer>${config.hour}</integer>
\t\t<key>Minute</key>
\t\t<integer>${config.minute}</integer>
\t</dict>
\t<key>StandardOutPath</key>
\t<string>${config.logFile}</string>
\t<key>StandardErrorPath</key>
\t<string>${config.errFile}</string>
\t<key>EnvironmentVariables</key>
\t<dict>
\t\t<key>PATH</key>
\t\t<string>/opt/homebrew/bin:/opt/homebrew/sbin:/usr/bin:/bin:/usr/sbin:/sbin</string>
\t</dict>
</dict>
</plist>
`;
}

export function installLaunchAgent(config: LaunchAgentConfig): void {
  const domain = getGuiDomain();
  const plistFile = getPlistFilePath(config.label);

  fs.mkdirSync(path.dirname(plistFile), { recursive: true });
  fs.mkdirSync(path.dirname(config.logFile), { recursive: true });
  fs.writeFileSync(plistFile, buildPlist(config));

  // Unload an existing agent if present, ignoring failures.
  spawnSync('launchctl', ['bootout', domain, plistFile], { stdio: 'ignore' });

  execFileSync('launchctl', ['bootstrap', domain, plistFile], {
    stdio: 'inherit',
  });
  execFileSync('launchctl', ['enable', `${domain}/${config.label}`], {
    stdio: 'inherit',
  });

  log.heading(`Installed LaunchAgent ${config.label}`);
}

export function uninstallLaunchAgent(label: string): void {
  const domain = getGuiDomain();
  const plistFile = getPlistFilePath(label);

  spawnSync('launchctl', ['bootout', domain, plistFile], { stdio: 'ignore' });
  fs.rmSync(plistFile, { force: true });

  log.heading(`Removed LaunchAgent ${label}`);
}
