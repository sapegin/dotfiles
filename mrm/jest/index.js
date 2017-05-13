'use strict';

const fs = require('fs');
const { json, lines, copyFiles, install } = require('mrm-core');

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

	const hasBabel = pkg.get(`devDependencies.babel-core`);

	// Babel
	if (hasBabel) {
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
		.add('coverage/')
		.save()
	;

	// .npmignore
	lines('.npmignore')
		.add('__tests__/')
		.save()
	;

	// ESLint
	if (pkg.get(`devDependencies.eslint`)) {
		const eslintignore = lines('.eslintignore')
			.add('coverage/*')
		;
		if (hasBabel) {
			eslintignore.add('lib/*');
		}
		eslintignore.save();
	}

	// Test template for small projects
	if (fs.existsSync('index.js')) {
		copyFiles(__dirname, 'test.js');
	}

	// Dependencies
	install(packages);
};
module.exports.description = 'Adds Jest';
