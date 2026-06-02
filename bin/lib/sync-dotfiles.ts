// Makes symlinks for dotfiles: ~/dotfiles/tilde/.bashrc => ~/.bashrc.
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { globSync } from 'glob';

interface SpecialEntry {
  source: string;
  destination: string;
  copy?: boolean;
}

const QUESTION_MARK = '\u001B[33m?\u001B[0m';
const HOME = os.homedir();
const TILDE_DIR = `${HOME}/dotfiles/tilde`;
const IGNORE = ['.DS_Store', 'Brewfile.lock.json'];
const SPECIALS: SpecialEntry[] = [
  {
    // Convenience symlink: iCloud Documents
    source: `${HOME}/Library/Mobile Documents/com~apple~CloudDocs`,
    destination: `${HOME}/cloud`,
  },
  {
    // Convenience symlink: Obsidian vault
    source: `${HOME}/Library/Mobile Documents/iCloud~md~obsidian/Documents/Murder`,
    destination: `${HOME}/murder`,
  },
  {
    // Visual Studio Code
    source: `${HOME}/dotfiles/vscode/User`,
    destination: `${HOME}/Library/Application Support/Code/User`,
  },
  {
    // Codex config
    source: `${HOME}/dotfiles/tilde/.codex/config.toml`,
    destination: `${HOME}/.codex/config.toml`,
  },
  {
    // Codex base prompt
    source: `${HOME}/dotfiles/ai-rules/AGENTS.md`,
    destination: `${HOME}/.codex/AGENTS.md`,
  },
  {
    // Codex skills
    source: `${HOME}/dotfiles/ai-rules/skills/*`,
    destination: `${HOME}/.codex/skills`,
  },
  {
    // Amp skills
    source: `${HOME}/dotfiles/ai-rules/skills/*`,
    destination: `${HOME}/.config/agents/skills`,
  },
  {
    // Copilot base prompt
    source: `${HOME}/dotfiles/ai-rules/AGENTS.md`,
    destination: `${HOME}/.copilot/instructions/base.instructions.md`,
  },
  {
    // Pi config
    source: `${HOME}/dotfiles/tilde/.pi/agent/settings.json`,
    destination: `${HOME}/.pi/agent/settings.json`,
  },
  {
    // Pi keybindings
    source: `${HOME}/dotfiles/tilde/.pi/agent/keybindings.json`,
    destination: `${HOME}/.pi/agent/keybindings.json`,
  },
  {
    // Pi base prompt
    source: `${HOME}/dotfiles/ai-rules/AGENTS.md`,
    destination: `${HOME}/.pi/agent/AGENTS.md`,
  },
  {
    // Pi Permission System extension config
    source: `${HOME}/dotfiles/tilde/.pi/agent/extensions/pi-permission-system/config.json`,
    destination: `${HOME}/.pi/agent/extensions/pi-permission-system/config.json`,
  },
  {
    // Photoshop
    source: `${HOME}/Library/Mobile Documents/com~apple~CloudDocs/Apps/Adobe Photoshop 2024 Settings`,
    destination: `${HOME}/Library/Preferences/Adobe Photoshop 2024 Settings`,
  },
];

function isSymlinkTo(link: string, dest: string): boolean {
  const statLink = fs.lstatSync(link);
  if (statLink.isSymbolicLink() === false) {
    return false;
  }

  return fs.realpathSync(link) === fs.realpathSync(dest);
}

async function confirmAction(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question(`${QUESTION_MARK} ${message} (y/N): `);
    const response = answer.toLowerCase().trim();
    return response === 'y' || response === 'yes';
  } finally {
    rl.close();
  }
}

async function syncDotfiles(): Promise<void> {
  process.chdir(TILDE_DIR);
  const files = [
    // Sync all files in tilde/ folder
    ...globSync('*', { dot: true, nodir: true }),
    // Sync additional config _folders_ in .config/ folder
    ...globSync('.config/*'),
  ];

  for (const sourceFile of files) {
    const sourcePath = `${TILDE_DIR}/${sourceFile}`;
    const destPath = `${HOME}/${sourceFile}`;

    if (IGNORE.includes(sourceFile)) {
      continue;
    }

    // Check that we aren't overwriting anything
    if (fs.existsSync(destPath)) {
      // Already a symlink to dotfiles?
      if (isSymlinkTo(destPath, sourcePath)) {
        continue;
      }

      // Should overwrite?
      const shouldOverwrite = await confirmAction(
        `File already exists: ${destPath}. Overwrite?`
      );
      if (shouldOverwrite === false) {
        console.log('Skipping…');
        continue;
      }

      // Remove
      fs.rmSync(destPath, { recursive: true });
    }

    // Create a symlink
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.symlinkSync(sourcePath, destPath);

    console.log('🦐', destPath, '→', sourcePath);
  }
}

async function syncSpecials(): Promise<void> {
  for (const { source, destination, copy } of SPECIALS) {
    const sources = source.endsWith('/*') ? globSync(source) : [source];

    for (const sourcePath of sources) {
      const destinationPath = source.endsWith('/*')
        ? path.join(destination, path.basename(sourcePath))
        : destination;

      // Check if the source exists
      if (fs.existsSync(sourcePath) === false) {
        continue;
      }

      // Check that we aren't overwriting anything
      if (fs.existsSync(destinationPath)) {
        if (copy) {
          // Already identical to the source file?
          if (
            fs.lstatSync(destinationPath).isFile() &&
            fs.readFileSync(sourcePath, 'utf8') ===
              fs.readFileSync(destinationPath, 'utf8')
          ) {
            continue;
          }
        } else {
          // Already a symlink to dotfiles?
          if (isSymlinkTo(destinationPath, sourcePath)) {
            continue;
          }
        }

        // Should overwrite?
        const shouldOverwrite = await confirmAction(
          `File already exists: ${destinationPath}. Overwrite?`
        );
        if (shouldOverwrite === false) {
          console.log('Skipping…');
          continue;
        }

        // Remove
        fs.rmSync(destinationPath, { recursive: true, force: true });
      }

      // Create a folder if needed
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });

      if (copy) {
        // Copy the file
        fs.copyFileSync(sourcePath, destinationPath);
      } else {
        // Create a symlink
        fs.symlinkSync(sourcePath, destinationPath);
      }

      console.log('🦐', sourcePath, '→', destinationPath);
    }
  }
}

async function main(): Promise<void> {
  console.log('Syncing dotfiles…');
  await syncDotfiles();
  await syncSpecials();
  console.log('Done.');
}

try {
  await main();
} catch (error) {
  console.error();
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
}
