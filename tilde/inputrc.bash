# Inspired by: https://github.com/janmoesen/tilde/blob/master/.inputrc

#
# Autocompletion
#

# Make Tab autocompletion case-insensitive (cd ~/dow<Tab> => cd ~/Downloads/)
set completion-ignore-case On

# When autocompleting symlinks to directories, immediately add a trailing "/"
set mark-symlinked-directories on

# Do not expand "~" to the home directory when completing. (The actual value passed on to the command still is expanded,
# though. Which is good.) "Off" is the default value, but some servers override this
set expand-tilde off

# Flip through autocompletion matches with Shift-Tab
"\e[Z": menu-complete

# Do not autocomplete hidden files ("dot files") unless the pattern explicitly begins with a dot
set match-hidden-files off

# Show all autocomplete results at once
set page-completions off

# If there are more than 200 possible completions for a word, ask to show them all
set completion-query-items 200

# Immediately show all possible completions
set show-all-if-ambiguous on

# Show extra file information when completing, like ls -F does
set visible-stats on

# Be more intelligent when autocompleting by also looking at the text after the cursor. For example, when the current
# line is "cd ~/src/mozil", and the cursor is on the "z", pressing Tab will not autocomplete it to "cd ~/src/mozillail",
# but to "cd ~/src/mozilla". (This is supported by the Readline used by Bash 4.)
set skip-completed-text on

# Use the text that has already been typed as the prefix for searching through commands (i.e. more intelligent Up/Down behavior)
"\e[B": history-search-forward
"\e[A": history-search-backward

# Try to stay at the same position when moving through the history
set history-preserve-point on


#
# Line editing
#

# Allow UTF-8 input and output, instead of showing them like $'\0123\0456'
set input-meta on
set output-meta on
set convert-meta off

# Delete for wonky terminals
"\e[3~": delete-char

# Home/End
"\e[1~": beginning-of-line
"\e[4~": end-of-line


#
# Misc
#

set bell-style none