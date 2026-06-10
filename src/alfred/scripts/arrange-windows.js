/* globals Application */

const LAPTOP_SCREEN_WIDTH = 1440;

// Windows that must be positioned on the LEFT half of the screen
const LEFTIES = [
	'electron', // Visual Studio Code
	'mimestream',
	'slack',
	'telegram',
	'webstorm',
];

// Windows that must be positioned on the RIGHT half of the screen
const RIGHTIES = [
	'finder',
	'forklift',
	'github desktop',
	'iterm2',
	'microsoft edge',
	'music',
	'script editor',
];

function resizeAppWindow(app, x, y, width, height) {
	try {
		app.windows[0].position = [x, y];
		app.windows[0].size = [width, height];
	} catch {
		// Ignore errors
	}
}

function getFrontmostApp() {
	return Application('System Events').applicationProcesses.where({
		frontmost: true,
	});
}

function resizeAll(width, height) {
	// All visible apps
	const visibleApps = Application('System Events').processes.whose({
		visible: true,
	});

	console.log('Visible apps:', visibleApps.length);

	for (const app of visibleApps) {
		const lowCaseName = app.name().toLowerCase();
		console.log('Trying to resize', lowCaseName);

		if (width > LAPTOP_SCREEN_WIDTH) {
			// We're on external screen
			if (LEFTIES.includes(lowCaseName)) {
				resizeAppWindow(app, 0, 0, width / 2, height);
			} else if (RIGHTIES.includes(lowCaseName)) {
				resizeAppWindow(app, width / 2, 0, width / 2, height);
			}
		} else if (
			LEFTIES.includes(lowCaseName) ||
			RIGHTIES.includes(lowCaseName)
		) {
			// We're on a laptop: maximize all windows
			resizeAppWindow(app, 0, 0, width, height);
		}
	}
}

// eslint-disable-next-line no-unused-vars
function run(command) {
	// Screen dimensions
	const { width, height } =
		Application('Finder').desktop.window.properties().bounds;

	console.log('Screen dimensions:', width, height);

	console.log('Command:', `[${command}]`, typeof command);

	switch (command.toString()) {
		case 'left': {
			resizeAppWindow(getFrontmostApp(), 0, 0, width / 2, height);
			break;
		}
		case 'right': {
			resizeAppWindow(getFrontmostApp(), width / 2, 0, width / 2, height);
			break;
		}
		case 'maximize': {
			resizeAppWindow(getFrontmostApp(), 0, 0, width, height);
			break;
		}
		default: {
			resizeAll(width, height);
		}
	}
}
