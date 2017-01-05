# Visual Studio Code settings

## Enable syncronization

```shell
rm -rf ~/Library/Application\ Support/Code/User
ln -s ~/dotfiles/vscode/User ~/Library/Application\ Support/Code/User
```

## Install command line helper

Run “Install 'code' command in PATH” from the command palette (View → Command Palette) to make Code available from the command line.

## Installed plugins

* beautify
* change-case
* Color Highlight
* Contextual Duplicate
* EditorConfig for VS Code
* ESLint
* [Squirrelsong Light Theme](https://marketplace.visualstudio.com/items?itemName=sapegin.Theme-SquirrelsongLight)
* Unique Lines

## Missing features

* Show whitespace on text selection (tabs, spaces, etc.) like in Sublime Text.
* `workbench.action.quickOpen` should preselect previous file by default (not current one) like in JetBrains.
* Really working reopening of all files on restart (only works if I open a folder but stopped to work as soon as I open a file from command line).
* Sane status bar color.
