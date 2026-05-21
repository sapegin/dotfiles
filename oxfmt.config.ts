import { defineConfig } from 'oxfmt';
import oxfmt from 'oxlint-config-raccoon/oxfmt';

export default defineConfig({
	...oxfmt,
	useTabs: true,
	ignorePatterns: [
		'vscode/*',
		'obsidian/*',
		'washingcode-book-master/*',
		'sapegin.me-master/*',
	],
});
