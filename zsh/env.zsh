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

# LS colors, made with http://geoff.greer.fm/lscolors/
export LSCOLORS="Gxfxcxdxbxegedabagacad"
export LS_COLORS='no=00:fi=00:di=01;34:ln=00;36:pi=40;33:so=01;35:do=01;35:bd=40;33;01:cd=40;33;01:or=41;33;01:ex=00;32:*.cmd=00;32:*.exe=01;32:*.com=01;32:*.bat=01;32:*.btm=01;32:*.dll=01;32:*.tar=00;31:*.tbz=00;31:*.tgz=00;31:*.rpm=00;31:*.deb=00;31:*.arj=00;31:*.taz=00;31:*.lzh=00;31:*.lzma=00;31:*.zip=00;31:*.zoo=00;31:*.z=00;31:*.Z=00;31:*.gz=00;31:*.bz2=00;31:*.tb2=00;31:*.tz2=00;31:*.tbz2=00;31:*.avi=01;35:*.bmp=01;35:*.fli=01;35:*.gif=01;35:*.jpg=01;35:*.jpeg=01;35:*.mng=01;35:*.mov=01;35:*.mpg=01;35:*.pcx=01;35:*.pbm=01;35:*.pgm=01;35:*.png=01;35:*.ppm=01;35:*.tga=01;35:*.tif=01;35:*.xbm=01;35:*.xpm=01;35:*.dl=01;35:*.gl=01;35:*.wmv=01;35:*.aiff=00;32:*.au=00;32:*.mid=00;32:*.mp3=00;32:*.ogg=00;32:*.voc=00;32:*.wav=00;32:*.patch=00;34:*.o=00;32:*.so=01;35:*.ko=01;31:*.la=00;33'

# Grep colors
export GREP_COLOR='1;33'

# Bat: https://github.com/sharkdp/bat
export BAT_THEME="DarkNeon"

# Homebrew install badge: beer sucks, coffee rules
export HOMEBREW_INSTALL_BADGE='☕'

# git-friendly: disable bundle after pull
export GIT_FRIENDLY_NO_BUNDLE=true

# git-friendly: disable URL copying after push
export GIT_FRIENDLY_NO_COPY_URL_AFTER_PUSH=true

# Ripgrep config file location
export RIPGREP_CONFIG_PATH="$HOME/.ripgreprc"

# Disable Gatsby telemetry
# https://www.gatsbyjs.org/docs/telemetry/
GATSBY_TELEMETRY_DISABLED=1
