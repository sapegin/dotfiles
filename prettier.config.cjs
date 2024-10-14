/** @type {import("prettier").Config} */
module.exports = {
	useTabs: true,
	singleQuote: true,
	trailingComma: 'es5',
	plugins: ['prettier-plugin-sh'],
	overrides: [
		{
			files: '*.md',
			options: {
				arrowParens: 'avoid',
				printWidth: 70,
				proseWrap: 'never',
				trailingComma: 'none',
				useTabs: false,
			},
		},
		{
			files: '*.{json,eslintrc,remarkrc,prettierrc}',
			options: {
				useTabs: false,
			},
		},
	],
};
