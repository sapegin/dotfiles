#!/usr/bin/env node

/*
 * Returns a list of coding projects in the Alfred’s Script Filter JSON format.
 *
 * Author: Artem Sapegin, sapegin.me
 * License: MIT
 * https://github.com/sapegin/dotfiles
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { globSync } from 'glob';

const untildify = (x) => x.replace(/^~/, os.homedir());

const envFile = untildify(`~/.env`);
const env = fs.existsSync(envFile)
	? parseEnv(fs.readFileSync(envFile, 'utf8'))
	: {};

const folders = [
	// Personal projects
	globSync(untildify(`~/_/*/`)),

	// Work projects
	env.WORK_PROJECTS_DIR
		? globSync(untildify(`${env.WORK_PROJECTS_DIR}/*/`))
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
