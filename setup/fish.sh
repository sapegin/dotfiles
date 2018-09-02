#!/bin/bash

# Installs Fish shell and registers is as the default shell

brew install fish

echo /usr/local/bin/fish | sudo tee -a /etc/shells
chsh -s /usr/local/bin/fish
ln -s ~/dotfiles/fish ~/.config/fish
