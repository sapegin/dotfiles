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

# LS colors
# Used by: fd
LS_COLORS=""
LS_COLORS+="di=34;;1:" # Directories
LS_COLORS+="ex=33:"    # Executable files
LS_COLORS+="ln=36:"    # Symlinks
LS_COLORS+="or=31:"    # Broken symlinks
export LS_COLORS

# Eza colors: https://github.com/eza-community/eza/blob/main/man/eza_colors.5.md
EZA_COLORS="reset:$LS_COLORS"                      # Reset default colors, like making everything yellow
EZA_COLORS+="da=36:"                               # Timestamps
EZA_COLORS+="ur=0:uw=0:ux=0:ue=0:"                 # User permissions
EZA_COLORS+="gr=0:gw=0:gx=0:"                      # Group permissions
EZA_COLORS+="tr=0:tw=0:tx=0:"                      # Other permissions
EZA_COLORS+="xa=0:"                                # Extended attribute marker ('@')
EZA_COLORS+="xx=38;5;240:"                         # Punctuation ('-')
EZA_COLORS+="nb=38;5;240:"                         # Files under 1 KB
EZA_COLORS+="nk=0:"                                # Files under 1 MB
EZA_COLORS+="nm=37:"                               # Files under 1 GB
EZA_COLORS+="ng=38;5;250:"                         # Files under 1 TB
EZA_COLORS+="nt=38;5;255:"                         # Files over 1 TB
EZA_COLORS+="do=32:*.md=32:"                       # Documents
EZA_COLORS+="co=35:*.zip=35:"                      # Archives
EZA_COLORS+="tm=38;5;242:cm=38;5;242:.*=38;5;242:" # Hidden and temporary files
export EZA_COLORS

# Homebrew install badge: beer sucks, coffee rules
export HOMEBREW_INSTALL_BADGE='☕'
# Disable telemetry
export HOMEBREW_NO_ANALYTICS=1

# Ripgrep config file location
export RIPGREP_CONFIG_PATH="$HOME/.ripgreprc"
