# Prepend $PATH without duplicates
function _prepend_path() {
	[[ -n "$1" ]] || return
	(( ${path[(Ie)$1]} )) && return
	path=("$1" $path)
}

# Extend $PATH

# Homebrew binaries
_prepend_path "/opt/homebrew/sbin"
_prepend_path "/opt/homebrew/bin"

# fnm, Node version manager (https://github.com/Schniz/fnm). This extends the
# $PATH, and should have priority over Homebrew but not over Dotfiles. Also,
# tell fnm explicitly that we're using zsh to avoid brittle autodetection.
eval "$(/opt/homebrew/bin/fnm env --shell zsh)"

# Unversioned symlinks for Homebrew’s python, python-config, pip etc. binaries
_prepend_path "$(brew --prefix python)/libexec/bin"

# Dotfiles binaries
_prepend_path "$HOME/dotfiles/bin/lib"
_prepend_path "$HOME/dotfiles/bin"
_prepend_path "$HOME/dotfiles/bin/symlinks"

# User binaries
_prepend_path "$HOME/bin"
