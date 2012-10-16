#!/bin/bash
# Installs/updates Sublime packages
#
# 1. Installs Package Control (all plugins listed in `Package Control.sublime-settings` will be installed after Sublime restarts).
# 2. Installs some packages from GitHub.

if [ `uname` == 'Darwin' ]; then
	cd ~/Library/Application\ Support/Sublime\ Text\ 2/Installed\ Packages
else
	cd ~/AppData/Roaming/Sublime\ Text\ 2/Installed\ Packages
fi

#
# Package Control
#

[ ! -f Package\ Control.sublime-package ] && curl -o Package\ Control.sublime-package http://sublime.wbond.net/Package%20Control.sublime-package


#
# GitHub
#

cd ../Packages

# Hayaku Bundle
if [ -d ./hayaku ]; then
	echo "Updating Hayaku Bundle..."
	cd hayaku
	git pull
	git submodule update
	cd ..
else
	echo "Installing Hayaku Bundle..."
	git clone -b sublime-master git://github.com/hayaku/hayaku.git --recursive
fi
