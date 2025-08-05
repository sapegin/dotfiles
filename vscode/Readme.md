# Visual Studio Code settings

## Enable synchronization

> [!NOTE]  
> This is already included with the setup script.

```shell
rm -rf ~/Library/Application\ Support/Code/User
ln -s ~/dotfiles/vscode/User ~/Library/Application\ Support/Code/User
```

## Install command line helper

Run “Install 'code' command in PATH” from the command palette (View → Command Palette) to make Code available from the command line.

## Install extensions

```bash
brew bundle install --file tilde/Brewfile
```

See [Brewfile](../tilde/Brewfile) for a list of extensions.
