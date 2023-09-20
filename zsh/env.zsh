# Locale
export LC_ALL=en_US.UTF-8
export LANG="en_US"

# n, Node version manager (http://git.io/n-install-repo)
export N_PREFIX="$HOME/n"

# Preferred editor for local and remote sessions
if [[ -n $SSH_CONNECTION ]]; then
	export EDITOR='nano'
else
	export EDITOR='micro'
fi

# Make less the default pager, add some options and enable syntax highlight using source-highlight
[ -n "$LESSPIPE" ] && export LESSOPEN="| ${LESSPIPE} %s"
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
export LESS="${less_options[*]}"
export PAGER='less'

# Highlighting inside manpages and elsewhere
export LESS_TERMCAP_mb="\e'[01;31m'"       # begin blinking
export LESS_TERMCAP_md="\e'[01;38;5;74m'"  # begin bold
export LESS_TERMCAP_me="\e'[0m'"           # end mode
export LESS_TERMCAP_se="\e'[0m'"           # end standout-mode
export LESS_TERMCAP_so="\e'[38;5;246m'"    # begin standout-mode - info box
export LESS_TERMCAP_ue="\e'[0m'"           # end underline
export LESS_TERMCAP_us="\e'[04;38;5;146m'" # begin underline

# Bat: https://github.com/sharkdp/bat
export BAT_THEME="Squirrelsong Dark"

# LS colors: https://the.exa.website/docs/colour-themes
# Used by: exa, fd
export LS_COLORS='di=34:ln=1;34:so=33:pi=33:ex=1;36:bd=34;46:cd=34;43:su=30;41:sg=30;46:tw=30;42:ow=30;43'

# Homebrew install badge: beer sucks, coffee rules
export HOMEBREW_INSTALL_BADGE='☕'

# git-friendly: disable bundle after pull
export GIT_FRIENDLY_NO_BUNDLE=true

# git-friendly: disable URL copying after push
export GIT_FRIENDLY_NO_COPY_URL_AFTER_PUSH=true

# Ripgrep config file location
export RIPGREP_CONFIG_PATH="$HOME/.ripgreprc"
