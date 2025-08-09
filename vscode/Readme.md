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

## Dim Catppuccin Latte icons theme icons colors

Patches [Catppuccin](https://github.com/catppuccin/vscode-icons/) Latte icons for VS Code with [Squirrelsong](../colors/Readme.md) color palette.

```shell
sync-vscode-icons
```

## Sync main settings with additional profiles

Generates Zen Mode Supreme profile.

```shell
sync-vscode-profiles
```

## Install extensions

```bash
brew bundle install --file tilde/Brewfile
```

See [Brewfile](../tilde/Brewfile) for a list of extensions.
