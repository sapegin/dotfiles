# Locale
set -gx LC_ALL en_US.UTF-8
set -gx LANG en_US

# n, Node version manager: http://git.io/n-install-repo
set -gx N_PREFIX ~/n

# Preferred editor for local and remote sessions
if [ $SSH_CONNECTION ]
	set -gx EDITOR nano
else
	set -gx EDITOR code
end

# Homebrew install badge: beer sucks, coffee rules
set -gx HOMEBREW_INSTALL_BADGE '☕'

# Disable bundle for git-friendly
set -gx GIT_FRIENDLY_NO_BUNDLE true

# Ripgrep config file location
set -gx RIPGREP_CONFIG_PATH ~/.ripgreprc

# Fzf: https://github.com/junegunn/fzf
# Use fd (https://github.com/sharkdp/fd) to respect .gitignore
set -gx FZF_DEFAULT_COMMAND 'fd --type f'
set -gx FZF_CTRL_T_COMMAND $FZF_DEFAULT_COMMAND
set -gx FZF_DEFAULT_OPTS "--color bg:-1,bg+:-1,fg:-1,fg+:#feffff,hl:#993f84,hl+:#d256b5,info:#676767,prompt:#676767,pointer:#676767"

# LS colors, made with http://geoff.greer.fm/lscolors/
set -gx LSCOLORS Gxfxcxdxbxegedabagacad
set -gx LS_COLORS 'no=00:fi=00:di=01;34:ln=00;36:pi=40;33:so=01;35:do=01;35:bd=40;33;01:cd=40;33;01:or=41;33;01:ex=00;32:*.cmd=00;32:*.exe=01;32:*.com=01;32:*.bat=01;32:*.btm=01;32:*.dll=01;32:*.tar=00;31:*.tbz=00;31:*.tgz=00;31:*.rpm=00;31:*.deb=00;31:*.arj=00;31:*.taz=00;31:*.lzh=00;31:*.lzma=00;31:*.zip=00;31:*.zoo=00;31:*.z=00;31:*.Z=00;31:*.gz=00;31:*.bz2=00;31:*.tb2=00;31:*.tz2=00;31:*.tbz2=00;31:*.avi=01;35:*.bmp=01;35:*.fli=01;35:*.gif=01;35:*.jpg=01;35:*.jpeg=01;35:*.mng=01;35:*.mov=01;35:*.mpg=01;35:*.pcx=01;35:*.pbm=01;35:*.pgm=01;35:*.png=01;35:*.ppm=01;35:*.tga=01;35:*.tif=01;35:*.xbm=01;35:*.xpm=01;35:*.dl=01;35:*.gl=01;35:*.wmv=01;35:*.aiff=00;32:*.au=00;32:*.mid=00;32:*.mp3=00;32:*.ogg=00;32:*.voc=00;32:*.wav=00;32:*.patch=00;34:*.o=00;32:*.so=01;35:*.ko=01;31:*.la=00;33'

# Make less the default pager, add some options
set -gx PAGER less

# 1. If the entire text fits on one screen, just show it and quit.
#    (Be more like "cat" and less like "more".)
# 2. Do not clear the screen first.
# 3. ignore case unless the search pattern is mixed.
# 4. Do not automatically wrap long lines.
# 5. Allow ANSI colour escapes, but no other escapes.
# 6. Do not ring the bell when trying to scroll past the end of the buffer.
# 7. Do not complain when we are on a dumb terminal.
set -gx LESS "--quit-if-one-screen --no-init --ignore-case --chop-long-lines --RAW-CONTROL-CHARS --quiet --dumb"

# Highlighting inside manpages and elsewhere
set -gx LESS_TERMCAP_mb \e'[01;31m'       # begin blinking
set -gx LESS_TERMCAP_md \e'[01;38;5;74m'  # begin bold
set -gx LESS_TERMCAP_me \e'[0m'           # end mode
set -gx LESS_TERMCAP_se \e'[0m'           # end standout-mode
set -gx LESS_TERMCAP_so \e'[38;5;246m'    # begin standout-mode - info box
set -gx LESS_TERMCAP_ue \e'[0m'           # end underline
set -gx LESS_TERMCAP_us \e'[04;38;5;146m' # begin underline
