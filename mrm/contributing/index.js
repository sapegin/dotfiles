'use strict';

const path = require('path');
const { template } = require('mrm-core');

module.exports = function() {
	// Create Contributing.md (no update)
	const filename = 'Contributing.md';
	const contributing = template(filename, path.join(__dirname, filename));
	if (!contributing.exists()) {
		contributing
			.apply({
				package: path.basename(process.cwd()),
			})
			.save();
	}
};
module.exports.description = 'Adds contributing guidelines';
