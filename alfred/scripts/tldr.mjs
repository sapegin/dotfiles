#!/usr/bin/env node

/*
 * Returns docs Markdown file in the Alfred’s Text View JSON format.
 *
 * https://www.alfredapp.com/help/workflows/user-interface/text/json/
 *
 * Author: Artem Sapegin, sapegin.me
 * License: MIT
 * https://github.com/sapegin/dotfiles
 */

import fs from 'node:fs';
import os from 'node:os';

const DOCS_ROOT = `${os.homedir()}/dotfiles/docs/gui/`;

const bundleId = process.argv[2];

try {
	const markdown = fs.readFileSync(`${DOCS_ROOT}/${bundleId}.md`, 'utf8');
	console.log(
		JSON.stringify({
			response: markdown,
		})
	);
} catch {
	console.log(
		JSON.stringify({ response: `No docs found for \`${bundleId}\`.` })
	);
}
