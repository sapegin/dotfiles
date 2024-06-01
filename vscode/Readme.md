# Visual Studio Code settings

## Enable synchronization

> [!INFO]
> This is already included with the setup script.

```shell
rm -rf ~/Library/Application\ Support/Code/User
ln -s ~/dotfiles/vscode/User ~/Library/Application\ Support/Code/User
```

## Install command line helper

Run “Install 'code' command in PATH” from the command palette (View → Command Palette) to make Code available from the command line.

## Install plugins

See [setup/vscode.sh](../setup/vscode.sh).
