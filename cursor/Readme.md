# Cursor settings

## Enable synchronization

> [!NOTE]  
> This is already included with the `dotfiles` command

```shell
rm -rf ~/Library/Application\ Support/Cursor/User
ln -s ~/dotfiles/cursor/User ~/Library/Application\ Support/Cursor/User
```

## Install command line helper

Run “Install 'cursor' command” from the command palette (View → Command Palette) to make Code available from the command line.

## Dim Catppuccin Latte icons theme icons colors

Patches [Catppuccin](https://github.com/catppuccin/vscode-icons/) Latte icons with [Squirrelsong](../colors/Readme.md) color palette.

```shell
sync-vscode-icons
```

## Install extensions

See [Brewfile](../tilde/Brewfile) for a list of extensions.
