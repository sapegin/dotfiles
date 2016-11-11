var fullscreen = S.op('move', {
	x: 'screenOriginX',
	y: 'screenOriginY',
	width: 'screenSizeX',
	height: 'screenSizeY'
});

var middle = S.op('move', {
	x: 'screenOriginX+screenSizeX/4',
	y: 'screenOriginY',
	width: 'screenSizeX/2',
	height: 'screenSizeY'
});

var leftHalf = S.op('move', {
	x: 'screenOriginX',
	y: 'screenOriginY',
	width: 'screenSizeX/2',
	height: 'screenSizeY'
});

var rightHalf = S.op('move', {
	x: 'screenSizeX/2',
	y: 'screenOriginY',
	width: 'screenSizeX/2',
	height: 'screenSizeY'
});

S.bnda({
	'f:ctrl;alt': fullscreen,
	'm:ctrl;alt': middle,
	'left:cmd;ctrl;alt': leftHalf,
	'right:cmd;ctrl;alt': rightHalf,
});
