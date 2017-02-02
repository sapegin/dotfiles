'use strict';

const fs = require('fs');
const mkdirp = require('mkdirp');
const { MrmError, json, yaml, lines, template, install } = require('mrm-core');

/* TODO:
config.pcss
styles.pcss
base fledermaus template
*/

const dependencies = [
	'tamia',
];
const devDependencies = [
	'babel-cli',
	'babel-core',
	'babel-eslint',
	'chokidar-cli',
	'classnames',
	'eslint-plugin-react',
	'fledermaus',
	'tamia-build',
];

const requireTask = task => {
	throw new MrmError(`Run ${task} task first:

mrm ${task}`);
};

const copyTemplate = filepath => {
	const file = template(filepath, path.join(__dirname, filepath));
	if (!file.get()) {
		file.apply().save();
	}
}

module.exports = function(config) {
    // Require EditorConfig
    if (!fs.existsSync('.editorconfig')) {
		requireTask('eslint');
    }
    // Require ESLint
    if (!fs.existsSync('.eslintrc')) {
		requireTask('eslint');
    }
    // Require stylelint
    if (!fs.existsSync('.stylelintrc')) {
		requireTask('stylelint');
    }

	const name = path.basename(process.cwd());

	// Create directories
	mkdirp.sync('config');
	mkdirp.sync('js');
	mkdirp.sync('public');
	mkdirp.sync('source');
	mkdirp.sync('src');
	mkdirp.sync('styles');
	mkdirp.sync('templates');
	mkdirp.sync('templates/components');

	// package.json
	const pkg = json('package.json');
	pkg
		.merge({
			name,
			version: '0.0.0',
			private: true,
			license: 'See license in <Readme.md>',
			scripts: {
				'start': 'tamia server & npm run build:watch',
				'test': 'npm run lint:css && npm run lint:js',
				'bundle': 'tamia bundle',
				'build': 'BABEL_DISABLE_CACHE=1 babel-node src',
				'build:watch': "chokidar source 'templates/**/*.jsx' -c 'BABEL_DISABLE_CACHE=1 babel-node src'",
				'lint:js': 'eslint . --fix --ext .js,.jsx',
				'lint:css': "stylelint '**/*.pcss'",
			},
			engines: {
				node: '>=7',
			},
		})
		.save()
	;

	// TODO: remove scripts.lint

	// .babelrc
	json('.babelrc')
		.merge({
			presets: ['./node_modules/tamia-build/config/babel-preset'],
		})
		.save()
	;

	// .eslintrc
	json('.eslintrc')
		.merge({
			parser: 'babel-eslint',
			extends: 'tamia/react',
			rules: {
				'no-confusing-arrow': 0,
				'react/react-in-jsx-scope': 0,
				'react/no-unknown-property': 0,
				'react/prop-types': 0,
			},
		})
		.save()
	;

	// .eslintignore
	lines('.eslintignore')
		.append('build')
		.save()
	;

	// .gitignore
	lines('.gitignore')
		.append([
			'public/*.html',
			'public/build/*.js',
			'public/build/*.css',
		])
		.save()
	;

	// Create Readme.md (no update)
	const readme = template('Readme.md', path.join(__dirname, 'Readme.md'));
	if (!readme.get()) {
		readme
			.apply({
				package: name,
			}, config())
			.save()
		;
	}

	// Create Fledermaus config (no update)
	const fledermausConfig = yaml('config/base.yml');
	if (!fledermausConfig.get('sourceFolder')) {
		fledermausConfig
			.merge({
				sourceFolder: 'source',
				sourceTypes: ['md', 'html'],
				templatesFolder: 'templates',
				assetsFolder: 'public',
				publicFolder: 'public',
				lang: 'en',
				url: 'http://sapegin.me',
				title: 'My site',
				description: 'My awesome site',
			})
			.save()
		;
	}

	// Copy templates (no update)
	copyTemplate('js/main.js');
	copyTemplate('source/index.md');
	copyTemplate('src/index.js');
	copyTemplate('styles/config.pcss');
	copyTemplate('styles/styles.pcss');
	copyTemplate('templates/Base.jsx');
	copyTemplate('templates/Page.jsx');

	// package.json: dependencies
	install(dependencies, { dev: false });
	install(devDependencies);
};
module.exports.description = 'Add Tâmia and Fledermaus';
