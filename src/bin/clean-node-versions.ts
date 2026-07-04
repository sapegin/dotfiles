// Removes all Node.js versions installed by `fnm` to clean up disk space.
// > Run `nnn` again to install a Node.js version required in the project's `.nvmrc`.
//
// - Remove old Node.js versions:
//
// `clean-node-versions`
//
// ---
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs/promises';
import path from 'node:path';
import { dirs } from '../util/files.ts';

const nodeVersionsDir = path.join(dirs.home, '.fnm', 'node-versions');

console.log('Removing all installed Node.js versions…');
await fs.rm(nodeVersionsDir, { recursive: true, force: true });
