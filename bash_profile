# Don't put duplicate lines in the history
export HISTCONTROL=ignoreboth:erasedups

# Set history length
HISTFILESIZE=1000000000
HISTSIZE=1000000

# Append to the history file, don't overwrite it
shopt -s histappend
# Check the window size after each command and, if necessary, update the values of LINES and COLUMNS
shopt -s checkwinsize
# Autocorrect typos in path names when using `cd`
shopt -s cdspell
# Save all lines of a multiple-line command in the same history entry (allows easy re-editing of multi-line commands)
shopt -s cmdhist
# Do not autocomplete when accidentally pressing Tab on an empty line. (It takes forever and yields "Display all 15 gazillion possibilites?")
shopt -s no_empty_cmd_completion;

# Do not overwrite files when redirecting using ">". Note that you can still override this with ">|"
set -o noclobber;

# Enable some Bash 4 features when possible:
# * `autocd`, e.g. `**/qux` will enter `./foo/bar/baz/qux`
# * Recursive globbing, e.g. `echo **/*.txt`
for option in autocd globstar; do
	shopt -s "$option" 2> /dev/null
done

# Locale
export LC_ALL=en_US.UTF-8
export LANG="en_US"

# Add `~/bin` to the `$PATH`
export PATH="$HOME/bin:/usr/local/bin:$PATH"

# If possible, add tab completion for many commands
[ -f /etc/bash_completion ] && source /etc/bash_completion

# Aliases and prompt
[ -f ~/.bash_aliases ] && source ~/.bash_aliases
[ -f ~/.bash_prompt ] && source ~/.bash_prompt

# Add tab completion for SSH hostnames based on ~/.ssh/config, ignoring wildcards
[ -e "$HOME/.ssh/config" ] && complete -o "default" -o "nospace" -W "$(grep "^Host" ~/.ssh/config | grep -v "[?*]" | cut -d " " -f2)" scp sftp ssh

# Nano is default editor
export EDITOR='nano';

# Tell ls to be colourful
export CLICOLOR=1

# Tell grep to highlight matches
export GREP_OPTIONS='--color=auto'

# Make less the default pager, and specify some useful defaults.
less_options=(
	# If the entire text fits on one screen, just show it and quit. (Be more
	# like "cat" and less like "more".)
	--quit-if-one-screen

	# Do not clear the screen first.
	--no-init

	# Like "smartcase" in Vim: ignore case unless the search pattern is mixed.
	--ignore-case

	# Do not automatically wrap long lines.
	--chop-long-lines

	# Allow ANSI colour escapes, but no other escapes.
	--RAW-CONTROL-CHARS

	# Do not ring the bell when trying to scroll past the end of the buffer.
	--quiet

	# Do not complain when we are on a dumb terminal.
	--dumb
);
export LESS="${less_options[*]}";
unset less_options;
export PAGER='less';
