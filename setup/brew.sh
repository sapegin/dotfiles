#!/bin/bash

# Installs Homebrew with some formulaes


# Setup Homebrew
command -v brew >/dev/null 2>&1 || ruby -e "$(curl -fsSkL raw.github.com/mxcl/homebrew/go)"

# Make sure we’re using the latest Homebrew
brew update

# Upgrade any already-installed formulae
brew upgrade

# GNU core utilities (those that come with OS X are outdated)
brew install coreutils
# GNU `find`, `locate`, `updatedb`, and `xargs`, g-prefixed
brew install findutils

# More recent versions of some OS X tools
brew tap homebrew/dupes
brew install homebrew/dupes/grep

# Git
brew install git
brew install git-extras
sudo bash < <( curl https://raw.github.com/jamiew/git-friendly/master/install.sh)

# MySQL
brew install mysql
unset TMPDIR
mysql_install_db --verbose --user=`whoami` --basedir="$(brew --prefix mysql)" --datadir=/usr/local/var/mysql --tmpdir=/tmp
/usr/local/opt/mysql/bin/mysqladmin -u root password 'root'

# Everything else
brew install unrar
brew install node

# Remove outdated versions from the cellar
brew cleanup
