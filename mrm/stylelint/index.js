'use strict';

const { json, lines, install } = require('mrm-core');

const defaultTest = 'echo "Error: no test specified" && exit 1';
const ext = '.pcss';
const preset = 'stylelint-config-standard';
const packages = [
	'stylelint',
	preset,
];

module.exports = function() {
	// .stylelintrc
	const stylelintrc = json('.stylelintrc');
	if (stylelintrc.get('extends') !== preset) {
		stylelintrc
			.merge({
				extends: preset,
				rules: {
					indentation: 'tab',
					'selector-pseudo-class-no-unknown': [true, {
						ignorePseudoClasses: [
							// CSS Modules
							'global',
						],
					}],
				},
			})
			.save()
		;
	}

	// .stylelintignore
	const stylelintignore = lines('.stylelintignore');
	stylelintignore
		.append('node_modules')
		.save()
	;

	// package.json
	const packageJson = json('package.json')
		.merge({
			scripts: {
				'lint:css': `stylelint '**/*${ext}'`,
			},
		})
	;

	// package.json: test command
	const test = packageJson.get('scripts.test');
	if (!test || test === defaultTest) {
		packageJson.set('scripts.test', 'npm run lint:css');
	}
	else if (!test.includes('lint:css')) {
		packageJson.set('scripts.test', `npm run lint:css && ${test}`);
	}

	packageJson.save();

	// package.json: dependencies
	if (!packageJson.get(`devDependencies.${preset}`)) {
		install(packages);
	}
};
module.exports.description = 'Adds stylelint with a standard preset';
