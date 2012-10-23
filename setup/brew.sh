#!/bin/bash

# Installs Homebrew with some formulaes


# Setup Homebrew
command -v brew >/dev/null 2>&1 || ruby -e "$(curl -fsSkL raw.github.com/mxcl/homebrew/go)"

# Make sure we’re using the latest Homebrew
brew update

# Upgrade any already-installed formulae
brew upgrade

# Install GNU core utilities (those that come with OS X are outdated)
brew install coreutils
# Install GNU `find`, `locate`, `updatedb`, and `xargs`, g-prefixed
brew install findutils

# Install more recent versions of some OS X tools
brew tap homebrew/dupes
brew install homebrew/dupes/grep
#brew tap josegonzalez/homebrew-php
#brew install php54

# Install everything else
brew install git
brew install git-extras
brew install unrar
brew install node

# Remove outdated versions from the cellar
brew cleanup
