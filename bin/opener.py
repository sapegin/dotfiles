#!/usr/bin/env python
# -*- coding: utf-8 -*-

#
# Magic project opener
# © 2012 Artem Sapegin (sapegin.me)
#


import os
import glob
import re
import sys
import argparse
import subprocess
import platform

WHAT_CHOICES = 'project', 'repo', 'wptheme'
IS_MAC = platform.system() == 'Darwin'


def main():
	projects_dir, project_name, what, is_open = parse_arguments()

	os.chdir(projects_dir)

	project = find_project(project_name)
	if not project:
		sys.exit('No project found.')

	func_name = 'find__%s' % what
	if func_name not in globals():
		sys.exit('Function not found.')

	func = globals()[func_name]
	folder = func(project)

	open('%s/%s' % (projects_dir, folder), is_open)


def parse_arguments():
	parser = argparse.ArgumentParser(description='Magic project opener.')
	parser.add_argument('projects_dir', nargs=1, help='Base projects directiory.')
	parser.add_argument('project_name', nargs=1, help='Fuzzy project name.')
	parser.add_argument('-w', '--what', choices=WHAT_CHOICES, default=WHAT_CHOICES[0], help='Part of project to open.')
	parser.add_argument('-o', '--open', action='store_true', help='Open in %s.' % ('Finder' if IS_MAC else 'Windows Explorer'))
	args = parser.parse_args()
	return args.projects_dir[0], args.project_name[0], args.what, args.open


def find_project(name):
	pattern = '.*'.join(list(name))
	folders = glob.glob('*/*/')
	for folder in folders:
		if re.search(pattern, folder, re.IGNORECASE):
			return folder
	return None


def find__project(project):
	return project


def find__repo(project):
	git = glob.glob(project + '/.git/')
	if git:
		return project

	repos = glob.glob(project + '/*/.git/')
	if not repos:
		sys.exit('Git repo not found in this project.')
	return os.path.dirname(os.path.dirname(repos[0]))


def find__wptheme(project):
	themes = glob.glob(project + '/*/wp-content/themes/*/')
	if not themes:
		sys.exit('Wordpress installation not found in this project.')
	return themes[0]


def open(path, is_open):
	path = os.path.normpath(path)
	if is_open:
		subprocess.Popen(r'%s "%s"' % ('open' if IS_MAC else 'explorer', path))
	else:
		# Should be used via Bash alias like this:
		# function proj {
		#   cd "$("C:\Cormorant\Dropbox\My Dropbox\Projects\opener.py" "C:\Cormorant\Dropbox\My Dropbox\Projects" $1 -w project $2)"
		# }
		print path


if __name__ == '__main__':
	main()
