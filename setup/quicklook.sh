#!/bin/bash

# Installs quick look plugins: qlImageSize

# qlImageSize
TMPDIR=`mktemp -d` && {
	cd $TMPDIR
	curl -o _.zip http://cloud.github.com/downloads/Nyx0uf/qlImageSize/qlImageSize.qlgenerator.zip
	unzip -d ~/Library/QuickLook _.zip
	rm -rf $TMPDIR
}

qlmanage -r