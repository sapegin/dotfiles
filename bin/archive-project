#!/usr/bin/env bash

#
# Archives project: commits/pushes last changes to remote repo, remove unnecessary files, zip and moves to archive folder
#
# Author: Artem Sapegin, sapegin.me
# License: MIT
# https://github.com/sapegin/dotfiles
#

archive_dir="$HOME/Dropbox/Projects/_Archive"


# Common stuff
RED="$(tput setaf 1)"
CYAN="$(tput setaf 6)"
BOLD="$(tput bold)"
UNDERLINE="$(tput sgr 0 1)"
NOCOLOR="$(tput sgr0)"
function header() { echo -e "$UNDERLINE$CYAN$1$NOCOLOR\n"; }
function error() { echo -e "$UNDERLINE$RED$1$NOCOLOR"; }

client=$(basename $(dirname $(dirname "$(pwd)")))
project=$(basename $(dirname "$(pwd)"))
project_name="$client/$project"

header "Archiving $project_name..."

# Git repo?
if [[ "true" != "$(git rev-parse --is-inside-work-tree 2>/dev/null)" ]]; then
	error "Not a Git repository."
	exit 1
fi

# Has remote origin?
if [ ! $(git remote show) ]; then
	repo=`basename "$(pwd)"`
	bb="https://bitbucket.org/repo/create"
	echo "$bb" | pbcopy
	error "Remote origin not found."
	echo
	echo "Repository: $repo"
	echo "Run git-github or git-bitbucket to link it with an ${BOLD}existing$NOCOLOR remote repository."
	echo "To create repository on BitBucket go to: $UNDERLINE$bb$NOCOLOR (copied to clipboard)."
	echo
	exit 1
fi

# Dirty repo?
if [ "$(git status --porcelain 2>/dev/null)" ]; then
	if [ "$1" == "--force" ]; then
		echo "Commiting all changes..."
		git add .
		git commit -am "Last commit."
		echo
	else
		error "Repository is dirty."
		echo
		echo "Run archive-project --force to continue (all changes will be automatically committed)."
		echo
		git status
		exit 1
	fi
fi

# Push to remove repo
echo "Pushing changes to remote repository..."
git push
echo

# Clean
echo "Cleaning..."

# Optimize repo
echo
echo "Optimizing repository..."
git gc

# Remove node_modules
echo
echo "Removing installed npm packages..."
find . -name node_modules -print0 | xargs -0 rm -rf

# Remove bower_components
echo
echo "Removing installed Bower components..."
find . -name bower_components -print0 | xargs -0 rm -rf

echo

# Zip
date=$(date +'%Y-%m')
zip="${archive_dir}/${date}_${client}_${project}.zip"
echo "Hardcore archiving action..."
mkdir -p "$archive_dir"
zip -rq $zip ..
echo

echo "Project archived to $zip."
echo "You can delete parent ($project_name) folder now."
echo
ls -lh "$zip"
echo
