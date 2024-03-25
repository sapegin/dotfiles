#!/usr/bin/env node

/*
 * Returns a list of coding projects in the Alfred’s Script Filter JSON format.
 *
 * Author: Artem Sapegin, sapegin.me
 * License: MIT
 * https://github.com/sapegin/dotfiles
 */

const fs = require('fs');
const path = require('path');
const userHome = require('user-home');
const glob = require('glob');

const folders = [glob.sync(`${userHome}/_/*/`), `${userHome}/dotfiles/`].flat();

const items = folders
	.map((file) => {
		const title = path.basename(file);
		const date = fs.statSync(file).atime;
		return {
			title,
			date,
			file,
		};
	})
	.map((doc) => ({
		title: doc.title,
		uid: doc.file,
		type: 'folder',
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
