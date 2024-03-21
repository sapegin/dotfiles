#!/bin/bash

# Better app icons
# A better alternative to this script: https://replacicon.app/
# https://www.sethvargo.com/replace-icons-osx/

sudo -v

ICONS_DIR="$HOME/dotfiles/icons"

# Nimble Commander
# https://www.iconarchive.com/show/variations-2-icons-by-guillendesign/Floppy-icon.html
cp "$ICONS_DIR/Floppy.icns" "/Applications/Nimble Commander.app/Contents/Resources/Icon.icns"
touch "/Applications/Nimble Commander.app"

# WezTerm
# https://dribbble.com/shots/656627-Terminal-Macintosh-Icon
cp "$ICONS_DIR/Terminal.icns" "/Applications/WezTerm.app/Contents/Resources/terminal.icns"
touch "/Applications/WezTerm.app"

# Visual Studio Code
# https://dribbble.com/shots/15424559-VS-Code-replacement-icon
cp "$ICONS_DIR/Code.icns" "/Applications/Visual Studio Code.app/Contents/Resources/Code.icns"
touch "/Applications/Visual Studio Code.app"

# TODO: Doesn't work
# Edge
cp "$ICONS_DIR/InternetExplorer.icns" "/Applications/Microsoft Edge.app/Contents/Resources/app.icns"
touch "/Applications/Microsoft Edge.app"

# Reset caches, restart stuffses
sudo rm -rf /Library/Caches/com.apple.iconservices.store
# killall Finder
killall Dock
