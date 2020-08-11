#!/usr/bin/env node

/*
 * Returns a list of TIL posts in the Afred’s Script Filter JSON format.
 *
 * Author: Artem Sapegin, sapegin.me
 * License: MIT
 * https://github.com/sapegin/dotfiles
 */

const fs = require('fs');
const path = require('path');
const userHome = require('user-home');
const glob = require('glob');

const FILES = `${userHome}/_/til/*/*.md`;

const items = glob
	.sync(FILES)
	.map((file) => {
		const contents = fs.readFileSync(file, 'utf8');
		const title = contents.match(/^#\s*(.*?)$/im);
		const date = contents.match(/^<!--\s*(\d\d\d\d-\d\d-\d\d)\s/m);
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
