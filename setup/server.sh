#!/bin/bash

# Configures Apache (macOS), PHP (macOS) and MySQL (Homebrew).

# Require Homebrew
command -v brew >/dev/null 2>&1 || { echo >&2 "Please install Homebrew first."; exit 1; }

# Ask for the administrator password upfront
sudo -v

# MySQL
brew install mysql
unset TMPDIR
mysql_install_db --verbose --user=`whoami` --basedir="$(brew --prefix mysql)" --datadir=/usr/local/var/mysql --tmpdir=/tmp
mysql.server start
/usr/local/opt/mysql/bin/mysqladmin -u root password 'root'

# PHP
cd /etc
sudo cp php.ini.default php.ini 
sudo sed -i '' "s^mysql.default_socket =^mysql.default_socket = /tmp/mysql.sock^" php.ini
sudo sed -i '' "s^;date.timezone =^date.timezone = Europe/Moscow^" php.ini
sudo sed -i '' "s^;extension=php_sqlite3.dll^extension=php_sqlite3.dll^" php.ini
sudo sed -i '' "s^display_errors = Off^display_errors = On^" php.ini

# Apache: enable PHP, .htaccess files, virtual hosts and set it to run as current user
cd /etc/apache2
sudo cp httpd.conf httpd.conf.bak
sudo cp extra/httpd-vhosts.conf extra/httpd-vhosts.conf.bak
sudo sed -i '' "s^#\(LoadModule rewrite_module\)^\1^" httpd.conf
sudo sed -i '' "s^#\(LoadModule php5_module\)^\1^" httpd.conf
sudo sed -i '' "s^#\(Include /private/etc/apache2/extra/httpd-vhosts.conf\)^\1^" httpd.conf
sudo sed -i '' "s^User _www^User `whoami`^" httpd.conf
sudo sed -i '' "s^Group _www^Group staff^" httpd.conf
echo -e "NameVirtualHost *:80\n\n<Directory />\n    AllowOverride All\n    Require all granted\n</Directory>\n" | sudo tee extra/httpd-vhosts.conf
cd -
sudo apachectl graceful
