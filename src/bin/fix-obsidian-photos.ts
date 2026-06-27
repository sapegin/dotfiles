// Adds year prefixes to IMG_* and _MG_* attachments in Obsidian daily notes,
// and updates the links in the Markdown files.
//
// Usage: fix-obsidian-photos
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs/promises';
import path from 'node:path';
import { dirs } from '../util/consts.ts';
import { run } from '../util/run.ts';

const ATTACHMENTS_DIR = path.join(dirs.obsidianVault, 'zz-attachments');
const LOG_DIR = path.join(dirs.obsidianVault, 'Log');

async function main(): Promise<void> {
  const mdFiles = await Array.fromAsync(fs.glob('**/*.md', { cwd: LOG_DIR }));

  console.log(`Found ${mdFiles.length} Markdown files in ${LOG_DIR}`);

  // iPhone photos
  const imgPattern = /!\[\[(IMG_\d{4}\.[^\]]+)]]/g;
  // Old camera photos that were never renamed
  const mgPattern = /!\[\[(_MG_[^\]]+)]]/g;
  let totalRenamed = 0;

  for (const file of mdFiles) {
    const filePath = path.join(LOG_DIR, file);
    const year = path.basename(path.dirname(file));
    let content = await fs.readFile(filePath, 'utf8');
    let modified = false;

    for (const match of content.matchAll(imgPattern)) {
      const oldName = match[1];
      const newName = `${year}_${oldName}`;
      const oldPath = path.join(ATTACHMENTS_DIR, oldName);
      const newPath = path.join(ATTACHMENTS_DIR, newName);

      try {
        await fs.rename(oldPath, newPath);
        console.log(`${oldName} → ${newName}`);
        totalRenamed++;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          console.error(`Not found: ${oldPath}`);
        } else {
          throw error;
        }
        continue;
      }

      content = content.replaceAll(`![[${oldName}]]`, `![[${newName}]]`);
      modified = true;
    }

    const noteDate = path.basename(file, '.md');
    for (const match of content.matchAll(mgPattern)) {
      const oldName = match[1];
      const id = oldName.match(/_MG_(\d+)/)?.[1];
      const ext = path.extname(oldName);
      const newName = `${noteDate}_${id}_Artem_Sapegin${ext}`;
      const oldPath = path.join(ATTACHMENTS_DIR, oldName);
      const newPath = path.join(ATTACHMENTS_DIR, newName);

      try {
        await fs.rename(oldPath, newPath);
        console.log(`${oldName} → ${newName}`);
        totalRenamed++;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          console.error(`Not found: ${oldPath}`);
        } else {
          throw error;
        }
        continue;
      }

      content = content.replaceAll(`![[${oldName}]]`, `![[${newName}]]`);
      modified = true;
    }

    if (modified) {
      await fs.writeFile(filePath, content);
    }
  }

  console.log(`Renamed ${totalRenamed} files`);
}

await run(main);
