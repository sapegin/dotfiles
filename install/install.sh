#!/bin/bash

# Dotfiles and bootstrap installer
# Installs git, clones repository and symlinks dotfiles to your home directory

if ! command -v git >/dev/null 2>&1; then
	if [ `uname` == 'Darwin' ]; then
		ruby -e "$(curl -fsSkL raw.github.com/mxcl/homebrew/go)"
		brew install git
	else 
		echo "Error: Git is required."
		exit
	fi
fi

echo "Installing dotfiles..."
cd ~ && git clone https://github.com/sapegin/dotfiles.git && cd dotfiles && ./sync.py
source ~/.bashrc

if [ `uname` == 'Darwin' ]; then
	echo -n "~/dotfiles/setup/bootstrap.sh" | pbcopy
	echo
	echo "Path to bootstrap script is copied to clipboard."
fi


# Nyan cat
# https://github.com/steckel/Git-Nyan-Graph/blob/master/nyan.sh
e='\033'
RESET="$e[0m"
BOLD="$e[1m"
CYAN="$e[0;96m"
RED="$e[0;91m"
YELLOW="$e[0;93m"
GREEN="$e[0;92m"
echo
echo -en $RED'-_-_-_-_-_-_-_'
echo -e $RESET$BOLD',------,'$RESET
echo -en $YELLOW'_-_-_-_-_-_-_-'
echo -e $RESET$BOLD'|   /\_/\\'$RESET
echo -en $GREEN'-_-_-_-_-_-_-'
echo -e $RESET$BOLD'~|__( ^ .^)'$RESET
echo -en $CYAN'-_-_-_-_-_-_-'
echo -e $RESET$BOLD'""  ""'$RESET
