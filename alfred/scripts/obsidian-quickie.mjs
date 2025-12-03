#!/usr/bin/env node

/*
 * Appends a quick note to the Obsidian inbox.
 *
 * Author: Artem Sapegin, sapegin.me
 * License: MIT
 * https://github.com/sapegin/dotfiles
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const VAULT_DIR = path.join(os.homedir(), 'murder');
const QUICKIES_FILE = path.join(VAULT_DIR, '⏳ Inbox/Quickies.md');

const text = process.argv[2];

if (text.trim() === undefined) {
	process.exit(0);
}

/** Format date as `YYYY-MM-DD_HHmm`. */
function formatDate(date) {
	return date.toISOString().slice(0, 16).replace('T', '_').replace(':', '');
}

try {
	const content = await fs.readFile(QUICKIES_FILE, 'utf8');

	const timestamp = formatDate(new Date());
	const newEntry = `* ${timestamp} — ${text}`;
	const newContent = content.trimEnd() + (content ? '\n' : '') + newEntry;

	await fs.writeFile(QUICKIES_FILE, newContent);
} catch (error) {
	console.error(error);
}
