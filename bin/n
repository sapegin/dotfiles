#!/usr/bin/env bash

# Runs given command using binary in node_modules/.bin of the current project
# https://github.com/ai/environment

if [ -d $(npm bin) ]; then
	PROG="$1"
	shift
	$(npm bin)/$PROG "$@"
else
	echo 'No node_modules in any dir of current path' 1>&2
	return 1
fi
