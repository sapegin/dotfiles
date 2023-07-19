# Visual Studio Code settings

## Enable synchronization

```shell
rm -rf ~/Library/Application\ Support/Code/User
ln -s ~/dotfiles/vscode/User ~/Library/Application\ Support/Code/User
```

## Install command line helper

Run “Install 'code' command in PATH” from the command palette (View → Command Palette) to make Code available from the command line.

## Install plugins

See [setup/vscode.sh](../setup/vscode.sh).

## Missing features

- ~~Show whitespace on text selection (tabs, spaces, etc.) like in Sublime Text — [#1477](https://github.com/Microsoft/vscode/issues/1477)~~ there’s an [acceptable workaround](https://github.com/Microsoft/vscode/issues/1477#issuecomment-305476169)
- ~~`workbench.action.quickOpen` should preselect previous file by default (not current one) like in JetBrains — [#6923](https://github.com/Microsoft/vscode/issues/6923)~~ a new command `workbench.action.quickOpenPreviousEditor` does exactly this
- ~~Really working reopening of all files on restart (only works if I open a folder but stopped to work as soon as I open a file from command line) — [#207](https://github.com/Microsoft/vscode/issues/207)~~
- ~~Sane status bar color — [#1884](https://github.com/Microsoft/vscode/issues/1884)~~
