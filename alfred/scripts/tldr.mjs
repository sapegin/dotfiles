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

import path from 'path';
import fs from 'fs';

const HOME = path.dirname(path.dirname(import.meta.dirname));

const bundleId = process.argv[2];

try {
	const markdown = fs.readFileSync(
		`${HOME}/dotfiles/docs/gui/${bundleId}.md`,
		'utf8'
	);
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
