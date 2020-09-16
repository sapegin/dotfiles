#!/bin/bash

# Installs Homebrew, Git, git-extras, git-friendly, hub, Node.js, etc.

# Ask for the administrator password upfront
sudo -v

# Install Homebrew
#command -v brew >/dev/null 2>&1 || ruby -e "$(curl -fsSkL raw.github.com/mxcl/homebrew/go)"

# Update Homebrew and already installed packages
brew update

# GNU core utilities (those that come with macOS are outdated)
brew install coreutils

# GNU `find`, `locate`, `updatedb`, and `xargs`, g-prefixed
brew install findutils
brew install tree

# Git
brew install git
brew install git-extras

# git-friendly
curl -sS https://raw.githubusercontent.com/jamiew/git-friendly/master/install.sh | bash

# Extend global $PATH
echo -e "setenv PATH $HOME/dotfiles/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" | sudo tee /etc/launchd.conf

# Everything else
brew install bat
brew install fd
brew install fzf && $(brew --prefix)/opt/fzf/install
brew install micro
brew install proselint
brew install ripgrep
brew install starship
brew install zsh-syntax-highlighting

# Node
# n, Node version manager
brew install n
npm config set loglevel warn

# Npm
npm i -g npm-upgrade
npm i -g tldr

# Remove outdated versions from the cellar
brew cleanup
