// Build, package, and install local VS Code extensions from source repos
// (the raccoon-vscode monorepo and the squirrelsong themes). Pulls each repo
// first (when its working tree is clean), packages each extension into a
// temporary .vsix, and installs it via the `code` CLI.
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

interface SourceConfig {
  // Path to the repo (may start with `~`)
  repo: string;
  // Commands to run in the repo to build the extensions
  buildCommands: string[];
  // Returns absolute paths to each extension directory to package
  getExtensionDirs(): AsyncIterable<string>;
}

const SOURCES: SourceConfig[] = [
  {
    repo: '~/_/raccoon-vscode',
    buildCommands: ['npm install --silent', 'npm run build'],
    getExtensionDirs() {
      const extensionsSrcDir = path.join(untildify(this.repo), 'extensions');
      return fs.glob(path.join(extensionsSrcDir, '*/'));
    },
  },
  {
    repo: '~/_/squirrelsong',
    buildCommands: [
      'npm install --silent',
      'npm run prepare-themes',
      'npm run prepare-vscode-icons',
    ],
    getExtensionDirs() {
      const repo = untildify(this.repo);
      return fs.glob(path.join(repo, 'themes/VSCode/Squirrel*/'));
    },
  },
];

function untildify(filePath: string): string {
  return filePath.replace(/^~/, os.homedir());
}

interface ExtensionPackageJson {
  name: string;
  version: string;
  publisher: string;
  main?: string;
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

function run(cmd: string, cwd: string): void {
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function hasCommand(cmd: string): boolean {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function processSource(
  source: SourceConfig,
  tempDir: string
): Promise<void> {
  const repo = untildify(source.repo);
  const repoName = path.basename(repo);

  console.log(`\n🔄 Checking ${repoName} repo…`);
  const repoStatus = execSync('git status --porcelain', {
    cwd: repo,
    encoding: 'utf8',
  });
  if (repoStatus.trim() === '') {
    run('git pull', repo);
  } else {
    console.warn('⚠️ Working tree is dirty, skipping git pull');
  }

  console.log(`\n🔨 Building ${repoName}…\n`);
  for (const cmd of source.buildCommands) {
    run(cmd, repo);
  }

  for await (const extensionDir of source.getExtensionDirs()) {
    const pkg = await readJson<ExtensionPackageJson>(
      path.join(extensionDir, 'package.json')
    );
    const id = `${pkg.publisher}.${pkg.name}`;

    if (pkg.main !== undefined) {
      const mainPath = path.join(extensionDir, pkg.main);
      if ((await doesPathExist(mainPath)) === false) {
        throw new Error(`Extension ${id}: missing ${pkg.main} after build`);
      }
    }

    const vsixPath = path.join(tempDir, `${id}-${pkg.version}.vsix`);

    console.log(`\n📦 Packaging ${id}@${pkg.version}…`);
    run(
      `npx --yes vsce package --no-dependencies --out ${JSON.stringify(vsixPath)}`,
      extensionDir
    );

    console.log();
    run(`code --install-extension ${JSON.stringify(vsixPath)} --force`, repo);
  }
}

async function main(): Promise<void> {
  for (const source of SOURCES) {
    if ((await doesPathExist(untildify(source.repo))) === false) {
      console.error(`⛔️ Repo not found: ${source.repo}`);
      process.exit(1);
    }
  }

  if (hasCommand('code') === false) {
    console.error('⛔️ The `code` CLI not found on PATH');
    process.exit(1);
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-vscode-ext-'));

  try {
    for (const source of SOURCES) {
      await processSource(source, tempDir);
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  console.log('\nDone 🦝');
}

try {
  await main();
} catch (error) {
  console.error();
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
}
