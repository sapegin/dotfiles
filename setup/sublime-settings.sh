#!/bin/bash
# Enables Sublime settings syncronization

if [ `uname` == 'Darwin' ]; then
	cd ~/Library/Application\ Support/Sublime\ Text\ 2/Packages
else
	cd ~/AppData/Roaming/Sublime\ Text\ 2/Packages
fi

[ ! -d ../Packages.bak ] && mkdir ../Packages.bak
mv User ../Packages.bak/User
ln -s ~/dotfiles/sublime/User User