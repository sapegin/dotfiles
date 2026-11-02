// Install and remove macOS LaunchAgents (scheduled or run-at-login).

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { dirs } from './files.ts';
import { log } from './tui.ts';

export interface LaunchAgentConfig {
  // Reverse-DNS identifier, e.g. `me.sapegin.backup`.
  label: string;
  // Single executable (mutually exclusive with `programArguments`).
  program?: string;
  // argv passed to launchd (mutually exclusive with `program`).
  programArguments?: readonly string[];
  // Daily schedule in 24-hour local time (use with `minute`, not `runAtLoad`).
  hour?: number;
  minute?: number;
  // Start once when the user logs in (not with `hour` / `minute`).
  runAtLoad?: boolean;
  // Absolute paths for captured stdout and stderr (optional).
  logFile?: string;
  errFile?: string;
}

function getPlistFilePath(label: string): string {
  return path.join(dirs.home, 'Library/LaunchAgents', `${label}.plist`);
}

function getGuiDomain(): string {
  return `gui/${process.getuid()}`;
}

function resolveProgramArguments(config: LaunchAgentConfig): readonly string[] {
  if (config.program !== undefined && config.programArguments !== undefined) {
    throw new Error(
      `LaunchAgent ${config.label}: use program or programArguments, not both`
    );
  }
  if (config.programArguments !== undefined) {
    if (config.programArguments.length === 0) {
      throw new Error(`LaunchAgent ${config.label}: programArguments is empty`);
    }
    return config.programArguments;
  }
  if (config.program !== undefined && config.program.length > 0) {
    return [config.program];
  }
  throw new Error(
    `LaunchAgent ${config.label}: program or programArguments is required`
  );
}

function assertValidSchedule(config: LaunchAgentConfig): void {
  const scheduled = config.hour !== undefined || config.minute !== undefined;
  const atLogin = config.runAtLoad === true;

  if (atLogin && scheduled) {
    throw new Error(
      `LaunchAgent ${config.label}: use runAtLoad or hour/minute, not both`
    );
  }
  if (atLogin) {
    return;
  }
  if (config.hour === undefined || config.minute === undefined) {
    throw new Error(
      `LaunchAgent ${config.label}: hour and minute are required unless runAtLoad is set`
    );
  }
}

/** Exported for unit tests. */
export function buildLaunchAgentPlist(config: LaunchAgentConfig): string {
  assertValidSchedule(config);
  const argv = resolveProgramArguments(config);
  const argumentLines = argv
    .map((entry) => `\t\t<string>${entry}</string>`)
    .join('\n');

  const triggerBlock =
    config.runAtLoad === true
      ? `\t<key>RunAtLoad</key>
\t<true/>
\t<key>LimitLoadToSessionType</key>
\t<string>Aqua</string>`
      : `\t<key>StartCalendarInterval</key>
\t<dict>
\t\t<key>Hour</key>
\t\t<integer>${config.hour}</integer>
\t\t<key>Minute</key>
\t\t<integer>${config.minute}</integer>
\t</dict>`;

  if (config.errFile !== undefined && config.logFile === undefined) {
    throw new Error(
      `LaunchAgent ${config.label}: errFile requires logFile`
    );
  }

  const logBlock =
    config.logFile === undefined
      ? ''
      : `\t<key>StandardOutPath</key>
\t<string>${config.logFile}</string>
\t<key>StandardErrorPath</key>
\t<string>${config.errFile ?? config.logFile}</string>`;

  // launchd does not expand `~`, so every path must be absolute.
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>Label</key>
\t<string>${config.label}</string>
\t<key>ProgramArguments</key>
\t<array>
${argumentLines}
\t</array>
${triggerBlock}
${logBlock}
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
  if (config.logFile !== undefined) {
    fs.mkdirSync(path.dirname(config.logFile), { recursive: true });
  }
  if (config.errFile !== undefined) {
    fs.mkdirSync(path.dirname(config.errFile), { recursive: true });
  }
  fs.writeFileSync(plistFile, buildLaunchAgentPlist(config));

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
