#!/usr/bin/env node

/*
 * Returns a list of coding projects in the Alfred’s Script Filter JSON format.
 *
 * Author: Artem Sapegin, sapegin.me
 * License: MIT
 * https://github.com/sapegin/dotfiles
 */

import fs from 'node:fs';
import path from 'node:path';
import untildify from 'untildify';
import dotenv from 'dotenv';
import { globSync } from 'glob';

dotenv.config({ path: untildify('~/.env'), quiet: true });

const folders = [
	// Personal projects
	globSync(untildify(`~/_/*/`)),

	// Work projects
	process.env.WORK_PROJECTS_DIR
		? globSync(untildify(`${process.env.WORK_PROJECTS_DIR}/*/`))
		: [],

	// Extra projects
	untildify(`~/dotfiles/`),

	// Cloud folders
	untildify(`~/Library/Mobile Documents/com~apple~CloudDocs`),
	untildify(`~/Library/Mobile Documents/com~apple~CloudDocs/Writings`),
].flat();

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
