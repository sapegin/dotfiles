#!/bin/bash

# Installs/updates Sublime packages
#
# 1. Installs Package Control (all plugins listed in `Package Control.sublime-settings` will be installed after Sublime restarts).
# 2. Installs some packages from GitHub.


if [ `uname` == 'Darwin' ]; then
	DIR=~/Library/Application\ Support/Sublime\ Text\ 2/Packages
else
	DIR=~/AppData/Roaming/Sublime\ Text\ 2/Packages
fi
[ ! -d "$DIR" ] && mkdir -p "$DIR"
cd "$DIR"


#
# Package Control
#

[ ! -d Package\ Control ] && [ ! -f Package\ Control.sublime-package ] && curl -o Package\ Control.sublime-package http://sublime.wbond.net/Package%20Control.sublime-package


#
# GitHub
#

# Hayaku Bundle
if [ -d ./hayaku ]; then
	echo "Updating Hayaku Bundle..."
	cd "$DIR/hayaku"
	git pull
	git submodule update
	cd ..
else
	echo "Installing Hayaku Bundle..."
	git clone -b sublime-master git://github.com/hayaku/hayaku.git --recursive
fi
