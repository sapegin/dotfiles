#!/bin/bash

# Configures Zsh, some global settings, XCode command line tools, Node.js, and some other command line tools

# Common stuff
RED="$(tput setaf 1)"
UNDERLINE="$(tput sgr 0 1)"
NOCOLOR="$(tput sgr0)"
function error() { echo -e "$UNDERLINE$RED$1$NOCOLOR\n"; }

# Check that Homebrew is installed
command -v brew > /dev/null 2>&1 || {
	error "Homebrew not installed: https://brew.sh/"
	exit 1
}

# Ask for the administrator password upfront
sudo -v

# Set Zsh as default shell
zsh_path=$(which zsh)
if ! grep -Fxq "$zsh_path" /etc/shells; then
	echo "🐚 Setting up Zsh as the default shell..."
	sudo bash -c "echo $zsh_path >> /etc/shells"
	chsh -s "$zsh_path" $USER
fi

# Extend global $PATH
if ! grep -Fq "$HOME/dotfiles" /etc/launchd.conf; then
	echo "🚧 Extending global \$PATH variable..."
	echo -e "setenv PATH $HOME/dotfiles/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" | sudo tee /etc/launchd.conf
fi

# Use Touch ID to authorize sudo
if [ ! -f /etc/pam.d/sudo_local ]; then
	echo "👆🏼 Enabling Touch ID to authorize sudo commands..."
	echo "auth       sufficient     pam_tid.so" | sudo tee /etc/pam.d/sudo_local
fi

# Install XCode command line tools, and accept its license
echo "🙅🏻‍♂️ Installing XCode command line tools..."
xcode-select --install
echo
echo "✍🏼 Accepting XCode license..."
xcodebuild -license
echo

# Node.js
echo "🚀 Installing Node.js dependencies..."
npm config set loglevel warn
npm install -g npm-upgrade
npm install
echo

# fzf, fuzzy finder
echo "🌁 Configuring FZF..."
$(brew --prefix)/opt/fzf/install
echo

# Sync dotfiles
echo "🐿️ Syncing dotfiles..."
$HOME/dotfiles/bin/lib/sync-dotfiles

# Sync color schemes
echo "🦄 Syncing color schemes..."
$HOME/dotfiles/bin/sync-colors

echo
echo "🦆 All done! Now, open a new terminal for the changes to take effect."

$HOME/dotfiles/bin/nyan
