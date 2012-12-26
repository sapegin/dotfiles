#!/usr/bin/env node

/**
 * HTML color converter
 * Convert #hex colors to HSL/HSLA (by default) or RGB/RGBA (if `--rgb` key specified).
 *
 * Usage: color [--rgb] [#]dead00 [alpha]
 *
 * Author: Artem Sapegin, sapegin.me
 * Based on https://github.com/LeaVerou/CSS.coloratum
 */

//jshint node:true

var format = 'hsl';
var args = process.argv.splice(2);
if (!args.length) helpme();

if (args[0] === '--rgb') {
	format = 'rgb';
	args = args.splice(1);
}
if (!args.length) helpme();

var rgb = hex2rgb(args[0]);
if (!rgb) helpme();

var alpha = args[1];

if (format === 'hsl') {
	console.log(toHslString(rgb2hsl(rgb), alpha));
}
else {
	console.log(toRgbString(rgb, alpha));
}


function helpme() {
	console.log('Usage: color [--rgb] [#]dead00 [alpha]');
	process.exit(1);
}

function hex2rgb(rgbString) {
	// Remove leading `#`
	rgbString = rgbString.replace(/^#/, '');

	// Parse `dead00` and `f00`
	var channels = [];
	if (rgbString.length === 3) {
		channels = rgbString.match(/([0-9a-f])/ig);
		channels = channels.map(function(hex) {
			return hex + hex;
		});
	}
	else {
		channels = rgbString.match(/([0-9a-f]){2}/ig);
	}
	if (channels.length !== 3) {
		return null;
	}

	// Convert to integers
	channels = channels.map(function(hex) {
		return parseInt(hex, 16);
	});

	return channels;
}

function rgb2hsl(rgb) {
	rgb = rgb.map(function(a) {
		return a / 2.55;
	});

	var hsl = [];
	var max = Math.max.apply(Math, rgb);
	var min = Math.min.apply(Math, rgb);

	hsl[2] = Math.round((min + max)/2);

	var d = max - min;

	if(d !== 0) {
		hsl[1] = Math.round(d*100 / (100 - Math.abs(2*hsl[2] - 100))) + '%';

		switch(max){
			case rgb[0]: hsl[0] = (rgb[1] - rgb[2]) / d + (rgb[1] < rgb[2] ? 6 : 0); break;
			case rgb[1]: hsl[0] = (rgb[2] - rgb[0]) / d + 2; break;
			case rgb[2]: hsl[0] = (rgb[0] - rgb[1]) / d + 4;
		}

		hsl[0] = Math.round(hsl[0]*60);
	}
	else {
		hsl[0] = 0;
		hsl[1] = '0%';
	}

	hsl[2] += '%';

	return hsl;
}

function toRgbString(rgb, alpha) {
	return 'rgb' + (alpha < 1 ? 'a' : '') + '(' + rgb.join(',') + ((alpha < 1 ? ',' + alpha : '') + ')').replace(/\b0\./, '.');
}

function toHslString(hsl, alpha) {
	return 'hsl' + (alpha < 1 ? 'a' : '') + '(' + hsl.join(',') + ((alpha < 1 ? ',' + alpha : '') + ')').replace(/\b0\./, '.');
}
