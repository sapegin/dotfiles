'use strict';

const fs = require('fs');
const { MrmError, json, lines, yaml, markdown, install } = require('mrm-core');

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
	const pkg = json('package.json');

	if (!pkg.get('devDependencies.semantic-release')) {
		throw new MrmError(`Install semantic-release first:

  yarn global add semantic-release-cli
  semantic-release-cli setup

WARNING: Do not agree to update your .travis.yml.

More info:
https://github.com/semantic-release/semantic-release#setup
`);
	}

	if (pkg.get('devDependencies.semantic-release-tamia')) {
		return;
	}

	pkg
		.merge({
			scripts: {
				'semantic-release': 'semantic-release pre && npm publish && semantic-release post',
			},
			release: {
				analyzeCommits: 'semantic-release-tamia/analyzeCommits',
				generateNotes: 'semantic-release-tamia/generateNotes',
				verifyRelease: 'semantic-release-tamia/verifyRelease',
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
		.add('Changelog.md')
		.save()
	;

	// Add npm package badge to Readme
	const name = pkg.get('name');
	const readme = markdown(config('readme', 'Readme.md'));
	if (readme.exists()) {
		readme
			.addBadge(
				`https://img.shields.io/npm/v/${name}.svg`,
				`https://www.npmjs.com/package/${name}`,
				'npm'
			)
			.save()
		;
	}

	// Dependencies
	install(packages);
};
module.exports.description = 'Customizes semantic-release';
