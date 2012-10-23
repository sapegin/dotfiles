#!/bin/bash

# Utils to install OSX apps in various formats
# Based on https://github.com/bkuhlmann/osx/blob/master/functions/installers.sh


INSTALLER_DIR=`mktemp -d`


# Downloads an installer to local disk
#
# @param $1 URL
# @param $2 File name
function download_installer {`
	echo "Downloading $1/$2..."
	cd "$INSTALLER_DIR"
	curl -LO "$1/$2"
	cd ..
}

# Installs an application
#
# @param Application folder
# @param Application name
function install_app {
	echo "Installing $2.app..."
	cp -a "$1/$2.app" "/Applications/"
}

# Installs an application via a DMG file
#
# @param $1 Donwload URL
# @param $2 Download file name
# @param $3 Mount path
# @param $4 App name
function install_dmg_app {
	mount_point="/Volumes/$3"

	download_installer "$1" "$2"
	download_file="$INSTALLER_DIR/$2"

	echo "Mounting $2..."
	hdiutil attach "$download_file" -noverify -readonly -noautoopenro -noidmereveal

	install_app "$mount_point" "$4"

	echo "Cleaning..."
	hdiutil detach -force "$mount_point"
	rm -f "$download_file"
}

# Removes temporary directory
function install_cleanup {
	rm -rf "$INSTALLER_DIR"
}
