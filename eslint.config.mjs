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
			'washingcode-book-master/*',
		],
	},
];
