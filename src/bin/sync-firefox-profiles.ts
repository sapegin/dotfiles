// Copies user.js and userChrome.css files to each Firefox (Developer Edition) profile
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs';
import path from 'node:path';
import { dirs } from '../util/files.ts';

const PROFILES_DIR = path.join(
  dirs.home,
  'Library/Application Support/Firefox/Profiles'
);

const TEMPLATE_DIR = path.join(dirs.dotfiles, 'firefox');

console.log();
console.log('Updating profiles…');

const profiles = fs.globSync(path.join(PROFILES_DIR, '*/'));

const templates = fs.globSync(path.join(TEMPLATE_DIR, '**/*.*'), {
  exclude: ['/**/*.md'],
});

for (const profileDirectory of profiles) {
  console.log();
  console.log(`Syncing ${path.basename(profileDirectory)} profile…`);

  for (const templateFile of templates) {
    const relativeTemplateFilepath = templateFile.replace(
      `${TEMPLATE_DIR}/`,
      ''
    );
    const absoluteFilepath = path.join(
      profileDirectory,
      relativeTemplateFilepath
    );

    if (fs.existsSync(absoluteFilepath)) {
      const templateModifiedTime = fs.statSync(templateFile);
      const userFileModifiedTime = fs.statSync(absoluteFilepath);
      if (userFileModifiedTime.mtime >= templateModifiedTime.mtime) {
        // Do nothing if the user file is not older than the template
        continue;
      }

      // Overwrite the existing file. Every time user.js is replaced (file
      // creation time changed), Firefox resets the profile
      console.log(`Updating ${path.basename(absoluteFilepath)}…`);
      const content = fs.readFileSync(templateFile, 'utf8');
      // Open file, this also removes the existing file content
      const file = fs.openSync(absoluteFilepath, 'w');
      // Append the new version
      fs.appendFileSync(file, content);
    } else {
      // Copy a new file if it doesn't exist
      console.log(`Creating ${path.basename(absoluteFilepath)}…`);
      fs.mkdirSync(path.dirname(absoluteFilepath), { recursive: true });
      fs.cpSync(templateFile, absoluteFilepath);
    }
  }
}
