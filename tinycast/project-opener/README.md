# Project Opener (Tinycast / Raycast)

Fuzzy search over project folders (same logic as `j`). Selecting an item opens the folder in Visual Studio Code.

## Build

```bash
cd tinycast/project-opener
npm install
npm run build
```

Output is in `dist/` (`package.json`, `assets/`, and `open-project.js`).

## Install in Tinycast

1. Tinycast → Settings → Extensions → enable extensions.
2. **Add Folder…** → choose `~/dotfiles/tinycast/project-opener/dist` (after `npm run build`).

Rebuild and re-add the folder when you change the command.

## Development in Raycast (optional)

With [Raycast](https://raycast.com) installed, `npm run dev` installs the extension into Raycast for live reload.
