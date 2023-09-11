#!/bin/bash

# Better app icons
# https://www.sethvargo.com/replace-icons-osx/

sudo -v

ICONS_DIR="$HOME/dotfiles/icons"

# ForkLift
cp "$ICONS_DIR/ForkLift.icns" "/Applications/ForkLift.app/Contents/Resources/AppIcon.icns"
touch "/Applications/ForkLift.app"

# Edge
cp "$ICONS_DIR/InternetExplorer.icns" "/Applications/Microsoft Edge.app/Contents/Resources/app.icns"
touch "/Applications/Microsoft Edge.app"

# Reset caches, restart stuffses
sudo rm -rf /Library/Caches/com.apple.iconservices.store
# killall Finder
killall Dock
