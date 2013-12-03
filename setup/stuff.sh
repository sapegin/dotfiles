#!/bin/bash

# Installs Homebrew, Git, git-extras, git-friendly, hub, Node.js, configures Apache, PHP, MySQL, etc.

# Ask for the administrator password upfront
sudo -v

# Install Homebrew
command -v brew >/dev/null 2>&1 || ruby -e "$(curl -fsSkL raw.github.com/mxcl/homebrew/go)"

# Make sure we’re using the latest Homebrew
brew update

# Upgrade any already-installed formulae
brew upgrade

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
sudo bash < <( curl https://raw.github.com/jamiew/git-friendly/master/install.sh)

# MySQL
brew install mysql
unset TMPDIR
mysql_install_db --verbose --user=`whoami` --basedir="$(brew --prefix mysql)" --datadir=/usr/local/var/mysql --tmpdir=/tmp
/usr/local/opt/mysql/bin/mysqladmin -u root password 'root'

# PHP
cd /etc
sudo cp php.ini.default php.ini 
sudo sed -i '' "s^mysql.default_socket =^mysql.default_socket = /tmp/mysql.sock^" php.ini

# Apache: enable PHP, .htaccess files, virtual hosts and set it to run as current user
cd /etc/apache2
sudo cp httpd.conf httpd.conf.bak
sudo cp extra/httpd-vhosts.conf extra/httpd-vhosts.conf.bak
sudo sed -i '' "s^#\(LoadModule php5_module\)^\1^" httpd.conf
sudo sed -i '' "s^#\(Include /private/etc/apache2/extra/httpd-vhosts.conf\)^\1^" httpd.conf
sudo sed -i '' "s^User _www^User `whoami`^" httpd.conf
sudo sed -i '' "s^Group _www^Group staff^" httpd.conf
echo -e "NameVirtualHost *:80\n\n<Directory />\n    AllowOverride All\n    Allow from all\n</Directory>\n" | sudo tee extra/httpd-vhosts.conf
cd -

# Extend global $PATH
echo -e "setenv PATH $HOME/dotfiles/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" | sudo tee /etc/launchd.conf

# Ag, the better ack, which is the better grep
brew install the_silver_searcher
brew install https://raw.github.com/nybblr/homebrew-dev/master/sack.rb

# Everything else
brew install unrar
brew install msmtp --with-macosx-keyring
brew install mutt --sidebar-patch

# Node.js
brew install node
brew install casperjs
npm config set loglevel warn
npm install -g grunt-cli
npm install -g yo
npm install -g jshint
npm install -g jscs
npm install -g bower
npm install -g docpad
npm install -g replace

# Python
brew install python

# Remove outdated versions from the cellar
brew cleanup
