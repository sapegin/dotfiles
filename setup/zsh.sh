#!/bin/bash

# Installs zsh and Oh My Zsh, registers zsh as a default shell

# zsh
brew install zsh
zsh_path=$(which zsh)
grep -Fxq "$zsh_path" /etc/shells || sudo bash -c "echo $zsh_path >> /etc/shells"
chsh -s "$zsh_path" $USER

# Oh My Zsh
sh -c "$(curl -fsSL https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"
