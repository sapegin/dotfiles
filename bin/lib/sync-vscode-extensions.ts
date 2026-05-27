// Build, package, and install local VS Code extensions from the raccoon-vscode
// monorepo. Pulls the monorepo first (when its working tree is clean), packages
// each extension into a temporary .vsix, and installs it via the `code` CLI.
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const EXTENSIONS_REPO = path.join(os.homedir(), '_/raccoon-vscode');
const EXTENSIONS_SRC_DIR = path.join(EXTENSIONS_REPO, 'extensions');

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

async function getExtensionDirectories(): Promise<string[]> {
  const entries = await fs.readdir(EXTENSIONS_SRC_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => path.join(EXTENSIONS_SRC_DIR, e.name))
    .toSorted();
}

async function main(): Promise<void> {
  if ((await doesPathExist(EXTENSIONS_REPO)) === false) {
    console.error(`⛔️ Repo not found: ${EXTENSIONS_REPO}`);
    process.exit(1);
  }

  if (hasCommand('code') === false) {
    console.error('⛔️ The `code` CLI not found on PATH');
    process.exit(1);
  }

  console.log('🔄 Checking raccoon-vscode repo…');
  const repoStatus = execSync('git status --porcelain', {
    cwd: EXTENSIONS_REPO,
    encoding: 'utf8',
  });
  if (repoStatus.trim() === '') {
    run('git pull', EXTENSIONS_REPO);
  } else {
    console.warn('⚠️ Working tree is dirty, skipping git pull');
  }

  console.log('\n🔨 Building extensions…\n');
  run('npm install --silent', EXTENSIONS_REPO);
  run('npm run build', EXTENSIONS_REPO);

  const extensionDirs = await getExtensionDirectories();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-vscode-ext-'));

  try {
    for (const extensionDir of extensionDirs) {
      const pkg = await readJson<ExtensionPackageJson>(
        path.join(extensionDir, 'package.json')
      );
      const id = `${pkg.publisher}.${pkg.name}`;

      const mainPath = path.join(extensionDir, pkg.main ?? 'unknown');
      if ((await doesPathExist(mainPath)) === false) {
        throw new Error(`Extension ${id}: missing ${pkg.main} after build`);
      }

      const vsixPath = path.join(tempDir, `${id}-${pkg.version}.vsix`);

      console.log(`\n📦 Packaging ${id}@${pkg.version}…`);
      run(
        `npx --yes vsce package --no-dependencies --out ${JSON.stringify(vsixPath)}`,
        extensionDir
      );

      console.log();
      run(
        `code --install-extension ${JSON.stringify(vsixPath)} --force`,
        EXTENSIONS_REPO
      );
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
