#!/bin/bash

# Installs Homebrew, Git, git-extras, git-friendly, hub, Node.js, etc.

# Ask for the administrator password upfront
sudo -v

# Install Homebrew
#command -v brew >/dev/null 2>&1 || ruby -e "$(curl -fsSkL raw.github.com/mxcl/homebrew/go)"

# Make sure we’re using the latest Homebrew
brew update

# Upgrade any already-installed formulae
brew upgrade --all

# GNU core utilities (those that come with OS X are outdated)
brew install coreutils
# GNU `find`, `locate`, `updatedb`, and `xargs`, g-prefixed
brew install findutils
brew install tree

# More recent versions of some OS X tools
brew tap homebrew/dupes
brew install homebrew/dupes/grep

# Git
brew install git
brew install git-extras
brew install hub
sudo bash < <( curl https://raw.githubusercontent.com/jamiew/git-friendly/master/install.sh)

# Extend global $PATH
echo -e "setenv PATH $HOME/dotfiles/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" | sudo tee /etc/launchd.conf

# Everything else
brew install the_silver_searcher
brew install gist
brew install exiftool

# Node.js
curl -L http://git.io/n-install | bash
npm config set loglevel warn
npm config set save-prefix '~'
npm install -g npm-upgrade
npm install -g diff-so-fancy
npm install -g github-release-from-changelog
npm install -g trash-cli

# Yarn
npm install -g yarn
yarn config set save-prefix '~'

# Python
brew install python

# Remove outdated versions from the cellar
brew cleanup
