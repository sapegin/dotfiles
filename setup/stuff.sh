#!/bin/bash

# Installs Git, git-friendly, Node.js, and many other command line tools

# Check that Homebrew is installed
command -v brew >/dev/null 2>&1 || { error "Homebrew not installed: https://brew.sh/"; exit 1; }

# Ask for the administrator password upfront
sudo -v

# Install XCode command line tools, and accept its license
xcode-select --install
xcodebuild -license

# Update Homebrew and already installed packages
brew update

# Git
brew install git

# git-friendly
brew install git-friendly/git-friendly/git-friendly

# Extend global $PATH
echo -e "setenv PATH $HOME/dotfiles/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" | sudo tee /etc/launchd.conf

# Node
# n, Node version manager
brew install n
npm config set loglevel warn

# Npm packages
npm install -g npm-upgrade
npm install -g tldr

# Everything else
brew install bat
brew install fd
brew install fig
brew install fzf && $(brew --prefix)/opt/fzf/install
brew install macos-trash
brew install micro
brew install proselint
brew install ripgrep
brew install starship
brew install git-delta
brew install bat-extras
brew install tree
brew install zsh-syntax-highlighting

# Remove outdated versions from the cellar
brew cleanup
