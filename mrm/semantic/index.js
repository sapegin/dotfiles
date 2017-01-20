'use strict';

const fs = require('fs');
const { MrmError, json, lines, yaml, install } = require('mrm-core');

const packages = [
	'semantic-release-tamia',
];

module.exports = function() {
    // Require .travis.yml
    if (!fs.existsSync('.travis.yml')) {
        throw new MrmError(`Run travis task first:

  mrm travis`);
    }

	// package.json
	const packageJson = json('package.json');

	if (!packageJson.get('devDependencies.semantic-release')) {
		throw new MrmError(`Install semantic-release first:

  yarn global add semantic-release-cli
  semantic-release-cli setup

WARNING: Do not agree to update your .travis.yml.

More info:
https://github.com/semantic-release/semantic-release#setup
`);
	}

	if (packageJson.get('devDependencies.semantic-release-tamia')) {
		return;
	}

	packageJson
		.merge({
			scripts: {
				'semantic-release': 'semantic-release pre && npm publish && semantic-release post',
			},
			release: {
				analyzeCommits: 'semantic-release-tamia/analyzeCommits',
				generateNotes: 'semantic-release-tamia/generateNotes',
				verifyRelease: 'semantic-release-tamia/verifyReleas',
			},
		})
		.save()
	;

	// .travis.yml
	yaml('.travis.yml')
		.merge({
			after_success: [
				'npm run semantic-release',
			],
			branches: {
				except: [
					'/^v\\d+\\.\\d+\\.\\d+$/',
				],
			},
		})
		.save()
	;

	// .gitignore
	lines('.gitignore')
		.append('Changelog.md')
		.save()
	;

	// package.json: dependencies
	install(packages);
};
module.exports.description = 'Customizes semantic-release';
