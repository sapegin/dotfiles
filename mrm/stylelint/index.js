'use strict';

const { json, lines, install } = require('mrm-core');

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
	const pkg = json('package.json')
		.merge({
			scripts: {
				'lint:css': `stylelint '**/*${ext}'`,
			},
		})
	;

	// package.json: pretest command
	const lintCommand = 'npm run lint:css';
	const pretest = pkg.get('scripts.pretest');
	if (!pretest) {
		pkg.set('scripts.pretest', lintCommand);
	}
	else if (!pretest.includes(lintCommand)) {
		pkg.set('scripts.pretest', `${pretest} && ${lintCommand}`);
	}

	pkg.save();

	// Dependencies
	install(packages);
};
module.exports.description = 'Adds stylelint with a standard preset';
