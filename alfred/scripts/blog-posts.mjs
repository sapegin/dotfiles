#!/usr/bin/env node

/*
 * Returns list of blog posts in Alfred’s Script Filter JSON format.
 *
 * Author: Artem Sapegin, sapegin.me
 * License: MIT
 * https://github.com/sapegin/dotfiles
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { globSync } from 'glob';

const FILES = `${os.homedir()}/_/sapegin.me/src/content/blog/*.md`;

const items = globSync(FILES)
	.map((file) => {
		const contents = fs.readFileSync(file, 'utf8');
		const title = contents.match(/^title: ["']?(.*?)["']?$/im);
		const date = contents.match(/^date: (.*?)$/m);
		return {
			title: title ? title[1] : '<***>',
			date: date ? date[1] : path.basename(file),
			file,
		};
	})
	.map((doc) => ({
		title: doc.title,
		subtitle: doc.date,
		uid: doc.file,
		type: 'file',
		valid: true,
		arg: doc.file,
		icon: {
			type: 'fileicon',
			path: doc.file,
		},
	}));

console.log(
	JSON.stringify({
		items,
	})
);
