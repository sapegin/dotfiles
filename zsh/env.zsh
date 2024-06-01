# Locale
export LC_ALL=en_US.UTF-8
export LANG="en_US"

# Preferred editor for local and remote sessions
if [[ -n $SSH_CONNECTION ]]; then
	export EDITOR='nano'
else
	export EDITOR='cot'
fi

# Make less the default pager, add some options
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
)
export LESS="${less_options[*]}"
export PAGER='less'

# Bat: https://github.com/sharkdp/bat
export BAT_THEME="Squirrelsong Dark"

# LS colors: https://the.exa.website/docs/colour-themes
# Used by: eza, fd
export LS_COLORS='di=34:ln=1;34:so=33:pi=33:ex=1;36:bd=34;46:cd=34;43:su=30;41:sg=30;46:tw=30;42:ow=30;43'

# Homebrew install badge: beer sucks, coffee rules
export HOMEBREW_INSTALL_BADGE='☕'
# Disable telemetry
export HOMEBREW_NO_ANALYTICS=1

# git-friendly: disable bundle after pull
export GIT_FRIENDLY_NO_BUNDLE=true

# git-friendly: disable URL copying after push
export GIT_FRIENDLY_NO_COPY_URL_AFTER_PUSH=true

# Ripgrep config file location
export RIPGREP_CONFIG_PATH="$HOME/.ripgreprc"
