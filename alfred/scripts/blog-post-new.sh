#!/usr/bin/env bash

# Copies current opened in iA Writer file to my blog’s folder, adds YAML
# frontmatter and opens it in VS Code.
#
# This script should be used from Alfred workflow.
#
# Author: Artem Sapegin, sapegin.me
# License: MIT
# https://github.com/sapegin/dotfiles
#

BLOG_DIR="$HOME/_/sapegin.me/"
FILEPATH_PREFIX="$BLOG_DIR/src/content/"
FILEPATH_SUFFIX="/blog/"
FILEPATH_EXT=".md"
DATE_FORMAT="%Y-%m-%d"

# Common stuff
function error() {
	$HOME/dotfiles/bin/dlg-error "$1" "Blog"
	exit 1
}
function ask() {
	$HOME/dotfiles/bin/dlg-prompt "$1" "$2" "Blog"
}

# TODO: Check whether file has a name

# Topmost opened in iA Writer file
source_file=$(osascript -e 'tell application "iA Writer" to set filepath to file of document 1' -e 'POSIX path of filepath')
source_name=$(basename "$source_file")

# Default slug: convert CamelCase or plain text file name to under_score, strip extension
slug=$(
	echo "$source_name" \
		|
		# Remove extension
		perl -pe 's/\.md$//' \
		|
		# CamelCase to dashes
		perl -pe 's/([A-Z])/-\l\1/g' \
		|
		# Spaces to dashes
		perl -pe 's/ /-/g' \
		|
		# Remove double spaces
		perl -pe 's/--/-/g' \
		|
		# Remove dash in the beginning
		perl -pe 's/^-//'
)

# Ask user to review the slug
slug=$(ask "Post slug:" "$slug")
if [ -z "$slug" ]; then
	error "You need to enter a post slug."
fi

# Destination Markdown file path
dest="$FILEPATH_PREFIX$FILEPATH_SUFFIX$slug$FILEPATH_EXT"

# Check dest file existence
if [ -f "$dest" ]; then
	error "Destination file $dest already exists."
fi

# Read post title
title=$(grep -m 1 '#' "$source_file" | sed -e 's^# ^^')

# Publishing date (today)
date=$(date +"$DATE_FORMAT")

# Copy template and source file to destination folder
sed -e "s^{title}^$title^" -e "s^{date}^$date^" "$(dirname $0)/blog-post-new.tmpl" > "$dest"
cat "$source_file" | perl -0pe 's/#.*\n//' >> "$dest"

# Open the file in the editor ($EDITOR isn’t available in Alfred)
code "$BLOG_DIR" "$dest"
