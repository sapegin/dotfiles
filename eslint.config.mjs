import tamia from 'eslint-config-tamia';

export default [
	...tamia,
	{
		rules: {
			// Most of the scripts use console.log() for UI
			'no-console': 'off',
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
