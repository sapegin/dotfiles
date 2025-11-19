#!/usr/bin/env node

/*
 * Searches in the bookmarks Markdown file, and returns the matches in
 * Alfred’s Script Filter JSON format.
 *
 * Inspired by: https://temochka.com/blog/posts/2025/02/11/text-bookmarks.html
 *
 * Author: Artem Sapegin, sapegin.me
 * License: MIT
 * https://github.com/sapegin/dotfiles
 */

import fs from 'node:fs';
import os from 'node:os';

const BOOKMARKS_FILE = `${os.homedir()}/cloud/Documents/Bookmarks.md`;

function formatSection(headings) {
	return headings.join(' → ');
}

function getHostName(url) {
	const match = url.match(/https?:\/\/(?:www\.)?([\w.-]+)[/:]/);
	return match[1] ?? '';
}

function parseBookmarks(markdown) {
	const lines = markdown.split('\n');
	const bookmarks = [];
	let headings = [];

	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		const line = lines[lineIndex];

		if (line.startsWith('#')) {
			// It's a heading
			const [, headingMark, heading] = line.match(/(#+) (.*)/);

			// Calculate the depth (number of # characters)
			const depth = headingMark.length;

			if (depth === 1) {
				// Skip the main heading, we know it's "Bookmarks"
			} else {
				// Remove the "closed" sections
				headings = headings.slice(0, depth - 2);
				// Add the current section title
				headings.push(heading);
			}
		} else if (line.startsWith('http://') || line.startsWith('https://')) {
			// Each paragraph is one bookmark where the first line is a title, and the
			// second line is a URL, so we take the line with the URL first
			const titleLineIndex = lineIndex - 1;
			const url = line.trim();
			const title = lines[titleLineIndex];
			const hostname = getHostName(url);
			const subtitle = `${hostname} • ${formatSection(headings)}`;
			const match =
				`${title.replace(/[()]/, '')} ${hostname} ${headings.at(-1)}`.replace(
					/[().]/,
					' '
				);
			bookmarks.push({
				valid: true,
				uid: url,
				title,
				subtitle,
				match,
				url,
				arg: url,
				mods: {
					alt: {
						valid: true,
						arg: `${BOOKMARKS_FILE}:${titleLineIndex + 1}`,
						subtitle: 'Press Enter to edit the bookmark',
					},
					cmd: {
						subtitle: 'Press Enter to copy the bookmark to clipboard',
					},
				},
			});
		}
	}

	return bookmarks;
}

// --------- 8< --------- 8< --------- 8< ---------

const items = parseBookmarks(fs.readFileSync(BOOKMARKS_FILE, 'utf8'));
console.log(
	JSON.stringify({
		items,
	})
);
