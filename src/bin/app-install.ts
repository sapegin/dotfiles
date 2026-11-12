// Pull, build, and symlink local Mac apps into /Applications. No releases or
// code signing — build on this machine.
//
// - Install all registered apps:
//
// `app-install`
//
// - Install one app:
//
// `app-install raccoon-toolbox`
//
// - Install and restart (kills a running instance first):
//
// `app-install hotdog --start`
//
// - Hotdog launch-at-login (canonical `/Applications/Hotdog.app` only):
//
// `app-install hotdog login install`
// `app-install hotdog login uninstall`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { restartApp } from '../util/apps.ts';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { dirs, doesPathExist, tildify } from '../util/files.ts';
import { pullIfClean } from '../util/git.ts';
import {
  installLaunchAgent,
  uninstallLaunchAgent,
} from '../util/launchAgent.ts';
import { syncLink } from '../util/sync.ts';
import { run, UserError } from '../util/tui.ts';

const OPTIONS = [
  { name: 'start', type: 'boolean', default: false },
  { name: 'args', rest: true },
] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

interface MacAppConfig {
  /** CLI name (e.g. `app-install hotdog`). */
  readonly name: string;
  /** Repo folder under `dirs.projects` when different from `name`. */
  readonly repo?: string;
  /** Commands to build production app. */
  readonly buildCommands: readonly string[];
  /** Path to the `.app` bundle, relative to the repo root. */
  readonly bundlePath: string;
}

const MAC_APPS: readonly MacAppConfig[] = [
  {
    name: 'raccoon-toolbox',
    buildCommands: ['npm ci --silent', 'npm run build:app'],
    bundlePath: 'src-tauri/target/release/bundle/macos/Raccoon Toolbox.app',
  },
  {
    name: 'hotdog',
    repo: 'raccoon-apps',
    buildCommands: [
      'command -v mise >/dev/null && mise install || true',
      'xcodegen',
      'CONFIGURATION=Release ./Scripts/build-xcode.sh Hotdog',
    ],
    bundlePath: 'build/Build/Products/Release/Hotdog.app',
  },
  {
    name: 'pastor',
    repo: 'raccoon-apps',
    buildCommands: [
      'command -v mise >/dev/null && mise install || true',
      './Scripts/build-ghostty.sh',
      'xcodegen',
      'CONFIGURATION=Release ./Scripts/build-xcode.sh Pastor',
    ],
    bundlePath: 'build/Build/Products/Release/Pastor.app',
  },
];

const APPLICATIONS_DIR = '/Applications';

/** Installed production bundle; matches the symlink target from `installMacApp`. */
export const HOTDOG_INSTALL_PATH = path.join(APPLICATIONS_DIR, 'Hotdog.app');

export const HOTDOG_LAUNCH_AGENT_LABEL = 'me.sapegin.hotdog';

export function assertCanonicalHotdogInstall(): void {
  let resolved: string;
  try {
    resolved = fs.realpathSync(HOTDOG_INSTALL_PATH);
  } catch {
    throw new UserError(
      `Hotdog is not at ${HOTDOG_INSTALL_PATH}. Run \`app-install hotdog\` first.`
    );
  }

  if (resolved.includes('/Build/Products/Debug/')) {
    throw new UserError(
      `Refusing launch-at-login: ${tildify(resolved)} is a Debug build. Install Release via \`app-install hotdog\`.`
    );
  }
}

export function installHotdogLoginAgent(): void {
  assertCanonicalHotdogInstall();
  installLaunchAgent({
    label: HOTDOG_LAUNCH_AGENT_LABEL,
    programArguments: ['/usr/bin/open', '-a', HOTDOG_INSTALL_PATH],
    runAtLoad: true,
  });
}

export function uninstallHotdogLoginAgent(): void {
  uninstallLaunchAgent(HOTDOG_LAUNCH_AGENT_LABEL);
}

function handleHotdogLoginSubcommand(args: readonly string[]): boolean {
  if (args[0] !== 'hotdog' || args[1] !== 'login') {
    return false;
  }

  const subcommand = args[2];
  if (subcommand === 'install') {
    installHotdogLoginAgent();
    return true;
  }
  if (subcommand === 'uninstall') {
    uninstallHotdogLoginAgent();
    return true;
  }

  throw new UserError('Usage: app-install hotdog login install|uninstall');
}

export function resolveMacApps(names: readonly string[]): MacAppConfig[] {
  if (names.length === 0) {
    return [...MAC_APPS];
  }

  const byName = new Map(MAC_APPS.map((app) => [app.name, app]));
  const selected: MacAppConfig[] = [];

  for (const name of names) {
    const app = byName.get(name);
    if (app === undefined) {
      const known = MAC_APPS.map((entry) => entry.name).join(', ');
      throw new UserError(`Unknown app: ${name}. Known apps: ${known}`);
    }
    selected.push(app);
  }

  return selected;
}

async function installMacApp(
  app: MacAppConfig,
  { start }: { start: boolean }
): Promise<void> {
  const repo = path.join(dirs.projects, app.repo ?? app.name);

  if ((await doesPathExist(repo)) === false) {
    throw new UserError(`Repo not found: ${tildify(repo)}`);
  }

  pullIfClean(repo);

  console.log(`\n Building ${app.name}…\n`);
  for (const cmd of app.buildCommands) {
    execSync(cmd, { cwd: repo, stdio: 'inherit' });
  }

  const bundlePath = path.join(repo, app.bundlePath);
  if ((await doesPathExist(bundlePath)) === false) {
    throw new UserError(
      `App bundle not found after build: ${tildify(bundlePath)}`
    );
  }

  const installPath = path.join(
    APPLICATIONS_DIR,
    path.basename(app.bundlePath)
  );
  console.log();
  await syncLink(bundlePath, installPath);

  if (start) {
    console.log(`\nStarting ${path.basename(installPath)}…`);
    await restartApp(installPath);
  }
}

export async function appInstall({ args, start }: Options): Promise<void> {
  if (handleHotdogLoginSubcommand(args)) {
    return;
  }

  for (const app of resolveMacApps(args)) {
    await installMacApp(app, { start });
  }
}

await run(import.meta.url, async () => {
  await appInstall(parseArgs(OPTIONS));
});
