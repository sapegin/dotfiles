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

import fs from 'fs-extra';
import untildify from 'untildify';
import { fromMarkdown } from 'mdast-util-from-markdown';

const BOOKMARKS_FILE = untildify(
	`~/Library/Mobile Documents/com~apple~CloudDocs/Documents/Bookmarks.md`
);

function formatSection(headings) {
	return headings.join(' → ');
}

function parseBookmarks(tree) {
	const bookmarks = [];
	let headings = [];

	for (const node of tree.children) {
		if (node.type === 'heading') {
			if (node.depth === 1) {
				// Skip the main heading, we know it's "Bookmarks"
			} else {
				// Remove the "closed" sections
				headings = headings.slice(0, node.depth - 2);
				// Add the current section title
				headings.push(node.children[0].value);
			}
		} else if (node.type === 'paragraph') {
			// Each paragraph is one bookmark where the first line is a title, and the
			// second line is a URL
			const [title, url] = node.children[0].value.trim().split('\n');
			bookmarks.push({
				valid: true,
				uid: url,
				title,
				subtitle: formatSection(headings),
				url,
				arg: url,
				mods: {
					alt: {
						valid: true,
						arg: `${BOOKMARKS_FILE}:${node.position.start.line}`,
						subtitle: 'Press Enter to edit the bookmark',
					},
				},
			});
		}
	}

	return bookmarks;
}

const markdown = fs.readFileSync(BOOKMARKS_FILE);

const tree = fromMarkdown(markdown);

const items = parseBookmarks(tree);

console.log(
	JSON.stringify({
		items,
	})
);
