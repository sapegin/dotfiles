#!/bin/bash
# Press "Intall font" button when font dialog opens
# Based on http://blog.ikato.com/post/15675823000/how-to-install-consolas-font-on-mac-os-x

brew install cabextract
TMPDIR=`mktemp -d` && {
	cd $TMPDIR
	curl -O http://download.microsoft.com/download/f/5/a/f5a3df76-d856-4a61-a6bd-722f52a5be26/PowerPointViewer.exe
	cabextract PowerPointViewer.exe
	cabextract ppviewer.cab
	open -W CONSOLA*.TTF
	rm -rf $TMPDIR
}
