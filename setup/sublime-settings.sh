#!/bin/bash

# Enables Sublime settings syncronization


if [ `uname` == 'Darwin' ]; then
	DIR=~/Library/Application\ Support/Sublime\ Text\ 2
else
	DIR=~/AppData/Roaming/Sublime\ Text\ 2
fi

[ ! -d "$DIR" ] && mkdir -p "$DIR/Packages"
if [ -d "$DIR/Packages/User" ]; then
	mkdir "$DIR/Packages.bak"
	mv "$DIR/Packages/User" "$DIR/Packages.bak/User"
fi
ln -s ~/dotfiles/sublime/User "$DIR/Packages/User"