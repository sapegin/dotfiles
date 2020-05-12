const fs = require('fs');
const path = require('path');
const {
	MrmError,
	json,
	yaml,
	lines,
	template,
	copyFiles,
	makeDirs,
	install,
} = require('mrm-core');

const dependencies = ['tamia@3.0.0-aplha.4'];
const devDependencies = [
	'babel-cli',
	'babel-eslint',
	'chokidar-cli',
	'classnames',
	'eslint-plugin-react',
	'fledermaus',
	'tamia-build',
];

const requireTask = (task) => {
	throw new MrmError(`Run ${task} task first:

mrm ${task}`);
};

module.exports = function (config) {
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
	makeDirs([
		'config',
		'js',
		'public',
		'source',
		'src',
		'styles',
		'templates',
		'templates/components',
	]);

	// package.json
	const pkg = json('package.json');
	pkg
		.unset('scripts.lint')
		.merge({
			name,
			version: '0.0.0',
			private: true,
			license: 'See license in <Readme.md>',
			scripts: {
				start: 'tamia server & npm run build:watch',
				test: 'npm run lint:css && npm run lint:js',
				bundle: 'tamia bundle',
				build: 'BABEL_DISABLE_CACHE=1 babel-node src',
				'build:watch':
					"chokidar source 'templates/**/*.jsx' -c 'BABEL_DISABLE_CACHE=1 babel-node src'",
				'lint:js': 'eslint . --fix --ext .js,.jsx',
				'lint:css': "stylelint '**/*.pcss'",
			},
			engines: {
				node: '>=7',
			},
		})
		.save();

	// .babelrc
	json('.babelrc')
		.unset('plugins')
		.set('presets', ['./node_modules/tamia-build/config/babel-preset'])
		.save();

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
		.save();

	// .eslintignore
	lines('.eslintignore').add('build/').save();

	// .gitignore
	lines('.gitignore')
		.add(['/public/**/*.html', '/public/build/*.js', '/public/build/*.css'])
		.save();

	// Create Readme.md (no update)
	const readme = template('Readme.md', path.join(__dirname, 'Readme.md'));
	if (!readme.get()) {
		readme
			.apply({
				name: config('name'),
				url: config('url'),
				package: name,
			})
			.save();
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
			.save();
	}

	// Copy templates (no update)
	copyFiles(
		__dirname,
		[
			'js/main.js',
			'source/index.md',
			'src/index.js',
			'styles/config.pcss',
			'styles/styles.pcss',
			'templates/Base.jsx',
			'templates/Page.jsx',
		],
		{
			overwrite: false,
		}
	);

	// Dependencies
	install(dependencies, {
		dev: false,
	});
	install(devDependencies);
};
module.exports.description = 'Add Tâmia and Fledermaus';
