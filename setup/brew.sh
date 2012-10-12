#!/bin/bash
# Based on https://github.com/mathiasbynens/dotfiles/blob/master/.brew

# Make sure we’re using the latest Homebrew
brew update

# Upgrade any already-installed formulae
brew upgrade

# Install GNU core utilities (those that come with OS X are outdated)
brew install coreutils
# Install GNU `find`, `locate`, `updatedb`, and `xargs`, g-prefixed
brew install findutils

# Install wget with IRI support
#brew install wget --enable-iri

# Install more recent versions of some OS X tools
brew tap homebrew/dupes
brew install homebrew/dupes/grep
#brew tap josegonzalez/homebrew-php
#brew install php54

# Install everything else
brew install git
brew install git-extras
#brew install node

# Remove outdated versions from the cellar
brew cleanup