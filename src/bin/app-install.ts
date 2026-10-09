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
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execSync } from 'node:child_process';
import path from 'node:path';
import { parseArgs, type ParsedArgs } from '../util/args.ts';
import { dirs, doesPathExist, tildify } from '../util/files.ts';
import { pullIfClean } from '../util/git.ts';
import { syncLink } from '../util/sync.ts';
import { run, UserError } from '../util/tui.ts';

const OPTIONS = [{ name: 'args', rest: true }] as const;

type Options = ParsedArgs<typeof OPTIONS>;

interface MacAppConfig {
  /** Repo folder name under `dirs.projects` (e.g. `raccoon-toolbox`). */
  readonly name: string;
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
];

const APPLICATIONS_DIR = '/Applications';

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

async function installMacApp(app: MacAppConfig): Promise<void> {
  const repo = path.join(dirs.projects, app.name);

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
}

export async function appInstall({ args }: Options): Promise<void> {
  for (const app of resolveMacApps(args)) {
    await installMacApp(app);
  }
}

await run(import.meta.url, async () => {
  await appInstall(parseArgs(OPTIONS));
});
