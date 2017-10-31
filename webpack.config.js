const path = require('path');

const destination = path.resolve(__dirname, 'dist');

module.exports = {
	entry: {
		panorama: './public/js/panorama.js'
	},
	output: {
		filename: '[name].js',
		path: destination
	},
	externals: {
		moment: 'moment',
		_: 'underscore',
		SVG: 'SVG'
	}
};
