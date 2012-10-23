#!/bin/bash

# Installs Chrome and makes it default browser


source "$HOME/dotfiles/includes/installer.sh"


# Install Chrome
install_dmg_app "https://dl.google.com/chrome/mac/stable/GGRO" "googlechrome.dmg" "Google Chrome" "Google Chrome"
# Make it default browser (it will not run Chrome)
open -a "Google Chrome" --args --make-default-browser


install_cleanup