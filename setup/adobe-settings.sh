#!/usr/bin/env bash

# Enables Adobe Photoshop and Lightroom settings syncronization

# Photoshop
PS_DIR=~/Library/Preferences/Adobe\ Photoshop\ CC\ Settings
mv "$PS_DIR" "$PS_DIR.bak"
ln -s ~/Dropbox/Prefs/Adobe/Adobe\ Photoshop\ CC\ Settings "$PS_DIR"

# Lightroom
LR_DIR=~/Library/Application\ Support/Adobe/Lightroom
mv "$LR_DIR" "$LR_DIR.bak"
ln -s ~/Dropbox/Prefs/Adobe/Lightroom "$LR_DIR"
