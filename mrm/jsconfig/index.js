// @ts-check

const { json } = require('mrm-core');

function task() {
	json('jsconfig.json')
		.merge({
			compilerOptions: {
				lib: ['esnext'],
			},
			exclude: ['node_modules'],
		})
		.save();
}
task.description = 'Adds jsconfig.json';

module.exports = task;
