import { defineConfig } from 'oxlint';
import typescript from 'oxlint-config-raccoon/typescript';

export default defineConfig({
	extends: [typescript],
	options: {
		typeAware: true,
		typeCheck: true,
	},
	rules: {
		// Most scripts use console.log() for UI
		'no-console': 'off',
		// Many scripts use process.exit()
		'unicorn/no-process-exit': 'off',
	},
	ignorePatterns: [
		'vscode/*',
		'obsidian/*',
		'washingcode-book-master/*',
		'sapegin.me-master/*',
	],
});
