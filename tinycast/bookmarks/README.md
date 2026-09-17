# Bookmarks (Tinycast / Raycast)

Search `~/cloud/Documents/Bookmarks.md`. Pick an item to open the URL in the default browser. Use **Edit Bookmarks File** in the action panel to open the markdown in Visual Studio Code.

## Build

```bash
cd tinycast/bookmarks
npm install
npm run build
```

Output is in `dist/`.

## Install in Tinycast

1. Tinycast → Settings → Extensions → enable extensions.
2. **Add Folder…** → choose `~/dotfiles/tinycast/bookmarks/dist` (after `npm run build`).

Rebuild and re-add the folder when you change the command.

## Development in Raycast (optional)

With [Raycast](https://raycast.com) installed, `npm run dev` installs the extension into Raycast for live reload.
