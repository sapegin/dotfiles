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

# GNU core utilities (those that come with macOS are outdated)
brew install coreutils
# GNU `find`, `locate`, `updatedb`, and `xargs`, g-prefixed
brew install findutils
brew install tree

# More recent versions of some macOS tools
brew tap homebrew/dupes
brew install homebrew/dupes/grep

# Git
brew install git
brew install git-extras
brew install hub
sudo bash < <( curl https://raw.githubusercontent.com/jamiew/git-friendly/master/install.sh)  # git-friendly

# Extend global $PATH
echo -e "setenv PATH $HOME/dotfiles/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" | sudo tee /etc/launchd.conf

# Everything else
brew install the_silver_searcher
brew install gist
brew install exiftool
brew install zsh-syntax-highlighting

# Node
curl -L http://git.io/n-install | bash  # n, Node version manager
npm config set loglevel warn

# Npm
npm i -g npm-upgrade
npm i -g diff-so-fancy
npm i -g trash-cli
npm i -g proselint
npm i -g textlint
npm i -g textlint-filter-rule-comments
npm i -g textlint-rule-apostrophe
npm i -g textlint-rule-common-misspellings
npm i -g textlint-rule-diacritics
npm i -g textlint-rule-no-dead-link
npm i -g textlint-rule-terminology
npm i -g textlint-rule-write-good

# Python
brew install python
pip install proselint

# Remove outdated versions from the cellar
brew cleanup
