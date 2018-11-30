/* global S */

const fullscreen = S.op('move', {
	x: 'screenOriginX',
	y: 'screenOriginY',
	width: 'screenSizeX',
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

const medium = S.op('move', {
	x: 'screenOriginX',
	y: 'screenOriginY',
	width: 'screenSizeX/4*3',
	height: 'screenSizeY',
});

S.bnda({
	'up:cmd;ctrl;alt': fullscreen,
	'left:cmd;ctrl;alt': leftHalf,
	'right:cmd;ctrl;alt': rightHalf,
	'down:cmd;ctrl;alt': medium,
});
