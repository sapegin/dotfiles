// Build, smoke-test, and install local Obsidian plugins from the
// raccoon-obsidian monorepo into the live vault, then update the install
// manifest at obsidian/installed-plugins.json.
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { atomicCopy } from '../util/atomicWrite.ts';
import { dirs } from '../util/files.ts';
import { run as runMain } from '../util/run.ts';
import { log } from '../util/theme.ts';

const PLUGINS_REPO = path.join(dirs.projects, 'raccoon-obsidian');
const PLUGINS_DIR = path.join(PLUGINS_REPO, 'plugins');
const TARGET_VAULT = path.join(dirs.obsidianVault, '.obsidian/plugins');
const MANIFEST_FILE = path.join(
  dirs.dotfiles,
  'obsidian/installed-plugins.json'
);

const REQUIRED_FILES = ['main.js', 'manifest.json'] as const;
const PLUGIN_FILES = [...REQUIRED_FILES, 'styles.css'] as const;

interface PluginManifest {
  id: string;
  name: string;
  version: string;
  isDesktopOnly?: boolean;
}

interface InstalledPlugin {
  id: string;
  version: string;
  /** Filename → sha256 hex digest */
  files: Record<string, string>;
}

interface InstallManifest {
  updated: string;
  plugins: InstalledPlugin[];
}

async function doesPathExist(fullPath: string): Promise<boolean> {
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
}

async function sha256(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function run(cmd: string, cwd: string): void {
  execSync(cmd, { cwd, stdio: 'inherit' });
}

async function getPluginsDirectories(): Promise<string[]> {
  const entries = await fs.readdir(PLUGINS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => path.join(PLUGINS_DIR, e.name))
    .toSorted();
}

function stubRequire(id: string): unknown {
  if (id === 'obsidian') {
    return new Proxy(
      {},
      {
        get: (_t, key) => {
          if (key === 'Plugin') {
            return class StubPlugin {};
          }
          // Constructor stub for Notice, MarkdownView, etc.
          return class Stub {};
        },
      }
    );
  }
  return {};
}

/**
 * Load main.js into a sandboxed module with stubbed `require('obsidian')` (and
 * other esbuild-externals), then verify:
 * - the code parses
 * - the default export is a class
 * - the class prototype defines `onload`
 */
async function smokeTest(
  pluginDir: string,
  manifest: PluginManifest
): Promise<void> {
  const mainPath = path.join(pluginDir, 'main.js');
  const code = await fs.readFile(mainPath, 'utf8');

  const moduleObj: { exports: Record<string, unknown> } = { exports: {} };
  let wrapped: (
    module: typeof moduleObj,
    exports: typeof moduleObj.exports,
    require: typeof stubRequire
  ) => void;
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- sandboxed plugin smoke-test
    wrapped = new Function(
      'module',
      'exports',
      'require',
      code
    ) as typeof wrapped;
  } catch (error) {
    throw new Error(
      `Plugin ${manifest.id}: main.js failed to parse: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  wrapped(moduleObj, moduleObj.exports, stubRequire);

  const defaultExport: unknown = moduleObj.exports.default;

  if (typeof defaultExport !== 'function') {
    throw new TypeError(
      `Plugin ${manifest.id}: default export is not a class (got ${typeof defaultExport})`
    );
  }
  const proto = (defaultExport as { prototype?: { onload?: unknown } })
    .prototype;
  if (typeof proto?.onload !== 'function') {
    throw new TypeError(
      `Plugin ${manifest.id}: default export class lacks onload() method`
    );
  }
}

async function installPlugin(
  pluginDir: string,
  manifest: PluginManifest,
  targetPluginsDir: string
): Promise<string> {
  const targetDir = path.join(targetPluginsDir, `obsidian-${manifest.id}`);
  await fs.mkdir(targetDir, { recursive: true });
  for (const file of PLUGIN_FILES) {
    const src = path.join(pluginDir, file);
    if (await doesPathExist(src)) {
      await atomicCopy(src, path.join(targetDir, file));
    }
  }
  return targetDir;
}

async function main(): Promise<void> {
  if ((await doesPathExist(PLUGINS_REPO)) === false) {
    log.error(`✕ Repo not found: ${PLUGINS_REPO}`);
    process.exit(1);
  }

  console.log(' Building plugins…\n');
  run('npm install --silent', PLUGINS_REPO);
  run('npm run build', PLUGINS_REPO);

  const pluginDirs = await getPluginsDirectories();
  if (pluginDirs.length === 0) {
    log.error('✕ No plugins found in', PLUGINS_DIR);
    process.exit(1);
  }

  const installedPlugins: InstalledPlugin[] = [];
  for (const pluginDir of pluginDirs) {
    const manifest = await readJson<PluginManifest>(
      path.join(pluginDir, 'manifest.json')
    );

    for (const required of REQUIRED_FILES) {
      if ((await doesPathExist(path.join(pluginDir, required))) === false) {
        throw new Error(
          `Plugin ${manifest.id}: missing ${required} after build`
        );
      }
    }

    console.log(`\n󰙨 Smoke-testing ${manifest.id}…`);
    await smokeTest(pluginDir, manifest);

    console.log(` Installing ${manifest.id}…`);
    if ((await doesPathExist(TARGET_VAULT)) === false) {
      log.warn(`   Target missing, skipping: ${TARGET_VAULT}`);
    } else {
      const where = await installPlugin(pluginDir, manifest, TARGET_VAULT);
      console.log(`  ↪ ${where}`);
    }

    const files: Record<string, string> = {};
    for (const file of PLUGIN_FILES) {
      const src = path.join(pluginDir, file);
      if (await doesPathExist(src)) {
        files[file] = await sha256(src);
      }
    }

    installedPlugins.push({
      id: manifest.id,
      version: manifest.version,
      files,
    });
  }

  const installManifest: InstallManifest = {
    updated: new Date().toISOString(),
    plugins: installedPlugins,
  };

  await fs.writeFile(
    MANIFEST_FILE,
    JSON.stringify(installManifest, null, 2),
    'utf8'
  );
}

await runMain(main, { printDone: true });
