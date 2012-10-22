#!/usr/bin/env python

"""
Dotfiles syncronization.
Makes symlinks for all files: ./tilde/bashrc.bash => ~/.bashrc.
Based on https://gist.github.com/490016
"""

import os
import glob
import shutil

SOURCE_DIR = 'tilde'
EXCLUDE = []
NO_DOT_PREFIX = []


def force_remove(path):
	if os.path.isdir(path) and not os.path.islink(path):
		shutil.rmtree(path, False)
	else:
		os.unlink(path)


def is_link_to(link, dest):
	is_link = os.path.islink(link)
	is_link = is_link and os.readlink(link).rstrip('/') == dest.rstrip('/')
	return is_link


def main():
	os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), SOURCE_DIR))
	for filename in [file for file in glob.glob('*') if file not in EXCLUDE]:
		dotfile = filename
		if filename not in NO_DOT_PREFIX:
			dotfile = '.' + dotfile
		dotfile = os.path.join(os.path.expanduser('~'), os.path.splitext(dotfile)[0])
		source = os.path.relpath(filename, os.path.dirname(dotfile))

		# Check that we aren't overwriting anything
		if os.path.exists(dotfile):
			if is_link_to(dotfile, source):
				continue

			response = raw_input("Overwrite file `%s'? [y/N] " % dotfile)
			if not response.lower().startswith('y'):
				print "Skipping `%s'..." % dotfile
				continue

			force_remove(dotfile)

		os.symlink(source, dotfile)
		print "%s => %s" % (dotfile, source)


if __name__ == '__main__':
	main()
