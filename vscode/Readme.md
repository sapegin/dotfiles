# Visual Studio Code settings

## Enable synchronization

```shell
rm -rf ~/Library/Application\ Support/Code/User
ln -s ~/dotfiles/vscode/User ~/Library/Application\ Support/Code/User
```

## Install command line helper

Run “Install 'code' command in PATH” from the command palette (View → Command Palette) to make Code available from the command line.

## Installed plugins

- [Beautify](https://marketplace.visualstudio.com/items?itemName=HookyQR.beautify)
- [change-case](https://marketplace.visualstudio.com/items?itemName=zhengxiaoyao0716.intelligence-change-case)
- [Color Highlight](https://marketplace.visualstudio.com/items?itemName=naumovs.color-highlight)
- [Contextual Duplicate](https://marketplace.visualstudio.com/items?itemName=lafe.contextualduplicate)
- [EditorConfig for VS Code](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Markdown Shortcuts](https://marketplace.visualstudio.com/items?itemName=mdickin.markdown-shortcuts)
- [Prettier - JavaScript formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [SpellChecker](https://marketplace.visualstudio.com/items?itemName=swyphcosmo.spellchecker)
- [Squirrelsong Light Theme](https://marketplace.visualstudio.com/items?itemName=sapegin.Theme-SquirrelsongLight)
- [Unique Lines](https://marketplace.visualstudio.com/items?itemName=bibhasdn.unique-lines)

## Missing features

- ~~Show whitespace on text selection (tabs, spaces, etc.) like in Sublime Text — [#1477](https://github.com/Microsoft/vscode/issues/1477)~~ there’s an [acceptable workaround](https://github.com/Microsoft/vscode/issues/1477#issuecomment-305476169)
- ~~`workbench.action.quickOpen` should preselect previous file by default (not current one) like in JetBrains — [#6923](https://github.com/Microsoft/vscode/issues/6923)~~ a new command `workbench.action.quickOpenPreviousEditor` does exactly this
- ~~Really working reopening of all files on restart (only works if I open a folder but stopped to work as soon as I open a file from command line) — [#207](https://github.com/Microsoft/vscode/issues/207)~~
- ~~Sane status bar color — [#1884](https://github.com/Microsoft/vscode/issues/1884)~~
