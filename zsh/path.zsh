# Prepend $PATH without duplicates
function _prepend_path() {
	if ! $(echo "$PATH" | tr ":" "\n" | grep -qx "$1"); then
		PATH="$1:$PATH"
	fi
}

# Extend $PATH

# Homebrew binaries
_prepend_path "/opt/homebrew/bin"

# fnm, Node version manager (https://github.com/Schniz/fnm)
# This extends the $PATH, and should have priority over Homebrew but not over Dotfiles
eval "$(/opt/homebrew/bin/fnm env)"

# Dotfiles binaries
_prepend_path "$HOME/dotfiles/bin/lib"
_prepend_path "$HOME/dotfiles/bin"

# User binaries
_prepend_path "$HOME/bin"

# Run locally installed Node.js binaries directly
_prepend_path "./node_modules/.bin"

export PATH
