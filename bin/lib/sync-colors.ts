// Two-way syncs themes between a local Squirrelsong clone and this dotfiles
// repo. For each managed file, the side with the newer mtime overwrites the
// other; equal mtimes do nothing.
//
// Aborts if the Squirrelsong working tree is dirty or runs `git pull` before
// syncing.
//
// Supports themes for the following apps:
// - [x] Bat
// - [x] Peek
// - [x] Fzf            (one-way: extracted from Readme.md)
// - [x] Ghostty
// - [x] Obsidian
// - [x] dotfiles/brain
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const HOME = os.homedir();

const LOCAL_ROOT = path.join(HOME, '_/squirrelsong');
const DEST_DIR = path.join(HOME, 'dotfiles/tilde');

let pushedBack = 0;

async function doesPathExist(fullPath: string): Promise<boolean> {
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

async function mtimeMs(filePath: string): Promise<number | null> {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtimeMs;
  } catch {
    return null;
  }
}

async function copyPreservingMtime(src: string, dest: string): Promise<void> {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
  const { atime, mtime } = await fs.stat(src);
  await fs.utimes(dest, atime, mtime);
}

/**
 * Two-way sync a single file between the Squirrelsong clone and the
 * destination. Identical contents are skipped regardless of mtime; otherwise
 * the side with the newer mtime overwrites the other.
 *
 * @param from Path inside LOCAL_ROOT.
 * @param toDir Destination directory. Relative paths are resolved against
 *   DEST_DIR; absolute paths are used as-is.
 */
async function sync(from: string, toDir: string): Promise<void> {
  const filename = path.basename(from);
  const src = path.join(LOCAL_ROOT, from);
  const dest = path.isAbsolute(toDir)
    ? path.join(toDir, filename)
    : path.join(DEST_DIR, toDir, filename);

  const srcMs = await mtimeMs(src);
  if (srcMs === null) {
    console.error(`   ✗ Source not found: ${src}`);
    process.exit(1);
  }

  const destMs = await mtimeMs(dest);

  if (destMs !== null) {
    const [srcBuf, destBuf] = await Promise.all([
      fs.readFile(src),
      fs.readFile(dest),
    ]);
    if (srcBuf.equals(destBuf)) {
      console.log(`   ✓  ${filename}`);
      return;
    }
  }

  if (destMs === null || srcMs > destMs) {
    console.log(`   ⬇  ${filename}`);
    await copyPreservingMtime(src, dest);
  } else {
    console.log(`   ⬆  ${filename}`);
    await copyPreservingMtime(dest, src);
    pushedBack++;
  }
}

async function main(): Promise<void> {
  /**
   * Squirrelsong repo: must be clean, then pull
   */
  console.log('🔄 Checking squirrelsong repo…');

  const repoStatus = execSync('git status --porcelain', {
    cwd: LOCAL_ROOT,
    encoding: 'utf8',
  });
  if (repoStatus.trim() !== '') {
    console.error(
      `Squirrelsong repo at ${LOCAL_ROOT} is dirty. Commit or stash changes first.`
    );
    process.exit(1);
  }

  execSync('git pull', { cwd: LOCAL_ROOT, stdio: 'inherit' });

  /**
   * Bat: https://github.com/sharkdp/bat?tab=readme-ov-file#adding-new-themes
   */
  console.log('🌈 Syncing Bat theme…');

  await sync(
    'themes/Sublime Text/Squirrelsong Dark Deep Purple/Squirrelsong Dark Deep Purple.tmTheme',
    '.config/bat/themes'
  );
  execSync('bat cache --build');

  /**
   * Ghostty
   */
  console.log('🌈 Syncing Ghostty themes…');

  await sync('themes/Ghostty/Squirrelsong Dark', '.config/ghostty/themes');
  await sync(
    'themes/Ghostty/Squirrelsong Dark Deep Purple',
    '.config/ghostty/themes'
  );

  /**
   * Peek
   */
  const peekThemeDir = `${HOME}/Library/Group Containers/9V456WSURS.com.bigzlabs.peekgroup/Library/Application Support/Styles`;

  if (await doesPathExist(peekThemeDir)) {
    console.log('🌈 Syncing Peek theme…');
    await sync('themes/Peek/custom.css', peekThemeDir);
  }

  /**
   * Fzf (one-way: extracted from Readme.md, patched into .zshrc)
   */
  console.log('🌈 Installing fzf theme…');

  const fzfThemeRegExp = /FZF_DEFAULT_OPTS=["'][^'"]+["']/g;
  const fzfThemeReadme = await fs.readFile(
    path.join(LOCAL_ROOT, 'themes/Fzf/Readme.md'),
    'utf8'
  );
  const zshRcFile = path.join(HOME, 'dotfiles/tilde/.zshrc');
  const fzfThemeTheme = fzfThemeReadme.match(fzfThemeRegExp)?.[1] ?? '';
  const zshRc = await fs.readFile(zshRcFile, 'utf8');
  const zshRcUpdated = zshRc.replace(fzfThemeRegExp, fzfThemeTheme);
  await fs.writeFile(zshRcFile, zshRcUpdated);

  console.log('   💡 Reopen your terminal to take effect');

  /**
   * Obsidian
   */
  const obsidianVaultDir = `${HOME}/murder/.obsidian`;
  const obsidianThemeDir = `${obsidianVaultDir}/themes/Squirrelsong`;

  if (await doesPathExist(path.dirname(obsidianVaultDir))) {
    console.log('🌈 Syncing Obsidian theme…');
    await sync('themes/Obsidian/Squirrelsong/manifest.json', obsidianThemeDir);
    await sync('themes/Obsidian/Squirrelsong/theme.css', obsidianThemeDir);
  }

  /**
   * Dotfiles/brain
   */
  console.log('🌈 Syncing dotfiles/brain theme…');

  await sync(
    'themes/VSCode/SquirrelsongLight/SquirrelsongLight.color-theme.json',
    `${HOME}/dotfiles/colors/shiki`
  );

  // --- 8< -- 8< ---
  console.log();
  if (pushedBack > 0) {
    console.log(
      `📝 ${pushedBack} files pushed back to squirrelsong; commit and push them.`
    );
    console.log();
  }
  console.log('🦜 Install all the remaining themes at:');
  console.log('https://sapegin.me/squirrelsong/#download');
}

try {
  await main();
} catch (error) {
  console.error();
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
}
