import tamia from 'eslint-config-tamia';
import tamiaTypeScript from 'eslint-config-tamia/typescript';

export default [
	...tamia,
	...tamiaTypeScript,
	{
		rules: {
			// Most scripts use console.log() for UI
			'no-console': 'off',
			// Many scripts use process.exit()
			'unicorn/no-process-exit': 'off',
		},
	},
	{
		ignores: [
			'mrm/tamia/js/*',
			'mrm/tamia/src/*',
			'vscode/*',
			'obsidian/*',
			'washingcode-book-master/*',
			'sapegin.me-master/*',
		],
	},
];
