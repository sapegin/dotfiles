'use strict';

const fs = require('fs');
const { MrmError, json, yaml, markdown } = require('mrm-core');

const uploadCommand = 'bash <(curl -s https://codecov.io/bash)';

module.exports = function(config) {
    // Require .travis.yml
    if (!fs.existsSync('.travis.yml')) {
        throw new MrmError(`Run travis task first:

  mrm travis`);
    }

	// .travis.yml
	const travisYml = yaml('.travis.yml');
	if (!travisYml.get('after_success', []).includes(uploadCommand)) {
		travisYml
			.merge({
				after_success: [uploadCommand],
			})
			.save()
		;
	}

	// Add Codecov package badge to Readme
	const pkg = json('package.json');
	const url = `https://codecov.io/gh/${config('github')}/${pkg.get('name')}`;
	markdown(config('readme', 'Readme.md'))
		.addBadge(
			`${url}/branch/master/graph/badge.svg`,
			url,
			'Codecov'
		)
		.save()
	;
};
module.exports.description = 'Adds Codecov';
