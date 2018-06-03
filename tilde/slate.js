/* global S */

const fullscreen = S.op('move', {
	x: 'screenOriginX',
	y: 'screenOriginY',
	width: 'screenSizeX',
	height: 'screenSizeY',
});

const middle = S.op('move', {
	x: 'screenOriginX+screenSizeX/4',
	y: 'screenOriginY',
	width: 'screenSizeX/2',
	height: 'screenSizeY',
});

const leftHalf = S.op('move', {
	x: 'screenOriginX',
	y: 'screenOriginY',
	width: 'screenSizeX/2',
	height: 'screenSizeY',
});

const rightHalf = S.op('move', {
	x: 'screenSizeX/2',
	y: 'screenOriginY',
	width: 'screenSizeX/2',
	height: 'screenSizeY',
});

S.bnda({
	'f:ctrl;alt': fullscreen,
	'm:ctrl;alt': middle,
	'left:cmd;ctrl;alt': leftHalf,
	'right:cmd;ctrl;alt': rightHalf,
});
