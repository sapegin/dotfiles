/*
 * Returns a list of coding projects in the Alfred’s Script Filter JSON format.
 *
 * Script Filter setting: disable “Alfred filters results”. This script already
 * filters and ranks via searchProjects(); Alfred’s filter hides fuzzy matches.
 *
 * Author: Artem Sapegin, sapegin.me
 * License: MIT
 * https://github.com/sapegin/dotfiles
 */

import path from 'node:path';
import {
  getProjectMatchText,
  searchProjects,
} from '../../util/projectsSearch.ts';

const query = process.argv.slice(2).join(' ').trim();

const items = searchProjects(query).map((folderPath) => {
  const title = path.basename(folderPath);

  return {
    title,
    match: getProjectMatchText(folderPath),
    type: 'folder',
    valid: true,
    arg: folderPath,
    icon: {
      type: 'fileicon',
      path: folderPath,
    },
  };
});

console.log(
  JSON.stringify({
    items,
    skipknowledge: true,
  })
);
