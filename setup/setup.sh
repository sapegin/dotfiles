#!/bin/bash

# Sets up the a new computer:
# - installs Homebrew, Zsh, all the software;
# - configures XCode command line tools, Node.js, etc.
#
# Author: Artem Sapegin, sapegin.me
# License: MIT
# https://github.com/sapegin/dotfiles

# Exit on any failed command
set -e

# Ask for the administrator password upfront
sudo -v

# Install Homebrew
if ! command -v brew > /dev/null 2>&1; then
	echo "🫖 Installing Homebrew…"
	/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install dependencies
echo "☕️ Installing Homebrew dependencies…"
brew bundle install --file tilde/Brewfile

# Set Zsh as default shell
echo "🐚 Setting up Zsh as default shell…"
zsh_path=$(which zsh)
if ! grep -Fxq "$zsh_path" /etc/shells; then
	sudo bash -c "echo $zsh_path >> /etc/shells"
fi
chsh -s "$zsh_path" $USER

# Extend global $PATH
if ! grep -Fq "$HOME/dotfiles" /etc/launchd.conf; then
	echo "🚧 Extending global \$PATH variable…"
	echo -e "setenv PATH $HOME/dotfiles/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" | sudo tee /etc/launchd.conf
fi

# Use Touch ID to authorize sudo
if [ ! -f /etc/pam.d/sudo_local ]; then
	echo "👆🏼 Enabling Touch ID to authorize sudo commands…"
	echo "auth       sufficient     pam_tid.so" | sudo tee /etc/pam.d/sudo_local
fi

# Install XCode command line tools, and accept its license
echo "🙅🏻‍♂️ Installing XCode command line tools…"
xcode-select --install
echo
echo "✍🏼 Accepting XCode license…"
xcodebuild -license
echo

# Node.js
echo "🚀 Installing Node.js dependencies…"
npm config set loglevel warn
npm install -g npm-upgrade
npm install
echo

# fzf, fuzzy finder
echo "🌁 Configuring fzf…"
$(brew --prefix)/opt/fzf/install
echo

# Sync dotfiles
echo "🐿️ Syncing dotfiles…"
$HOME/dotfiles/bin/lib/sync-dotfiles

# Sync color schemes
echo "🦄 Syncing color themes…"
$HOME/dotfiles/bin/sync-colors

echo
echo "🦆 All done! Now, open a new terminal for the changes to take effect."

$HOME/dotfiles/bin/nyan
