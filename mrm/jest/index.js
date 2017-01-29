'use strict';

const { json, lines, install } = require('mrm-core');

const defaultTest = 'echo "Error: no test specified" && exit 1';
const packages = [
	'jest',
];

module.exports = function() {
	// package.json
	const pkg = json('package.json')
		.merge({
			scripts: {
				'test:jest': 'jest',
				'test:watch': 'jest --watch',
				'test:coverage': 'jest --coverage',
			},
		})
	;

	// Babel
	if (pkg.get(`devDependencies.babel-core`)) {
		packages.push('babel-jest');
		pkg.merge({
			jest: {
				testPathIgnorePatterns: [
					"<rootDir>/lib/"
				],
			},
		});
	}

	// package.json: test command
	const test = pkg.get('scripts.test');
	if (!test || test === defaultTest) {
		pkg.set('scripts.test', 'npm run test:jest');
	}
	else if (!test.includes('test:jest')) {
		pkg.set('scripts.test', `${test} && npm run test:jest`);
	}

	pkg.save();

	// .gitignore
	lines('.gitignore')
		.append('coverage')
		.save()
	;

	// .npmignore
	lines('.npmignore')
		.append('__tests__')
		.save()
	;

	// ESLint
	if (pkg.get(`devDependencies.eslint`)) {
		lines('.eslintignore')
			.append('coverage')
			.save()
		;
		json('.eslintrc')
			.merge({
				globals: {
					jest: false,
					expect: false,
				},
			})
			.save()
		;
	}

	// package.json: dependencies
	install(packages);
};
module.exports.description = 'Adds Jest';
