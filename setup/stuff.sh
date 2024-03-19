#!/bin/bash

# Installs Git, git-friendly, Node.js, and many other command line tools

# Common stuff
RED="$(tput setaf 1)"
UNDERLINE="$(tput sgr 0 1)"
NOCOLOR="$(tput sgr0)"
function error() { echo -e "$UNDERLINE$RED$1$NOCOLOR\n"; }

# Check that Homebrew is installed
command -v brew > /dev/null 2>&1 || {
	error "Homebrew not installed: https://brew.sh/"
	exit 1
}

# Ask for the administrator password upfront
sudo -v

# Extend global $PATH
echo -e "setenv PATH $HOME/dotfiles/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" | sudo tee /etc/launchd.conf

# Install XCode command line tools, and accept its license
xcode-select --install
xcodebuild -license

# Update Homebrew and already installed packages
brew update

# Git
brew install git

# git-friendly
brew install git-friendly/git-friendly/git-friendly

# Node.js, fallback version
brew install node
npm config set loglevel warn

# n, Node.js version manager
brew install n

# Npm packages
npm install -g npm-upgrade

# fzf, fuzzy finder
brew install fzf
$(brew --prefix)/opt/fzf/install

# Everything else
brew install bat
brew install fd
brew install git-delta
brew install lazygit
brew install macos-trash
brew install micro
brew install midnight-commander
brew install neofetch
brew install proselint
brew install ripgrep
brew install starship
brew install tldr
brew install tree
brew install webp
brew install zsh-syntax-highlighting

# Remove outdated versions from the cellar
brew cleanup
