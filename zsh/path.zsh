# Prepend $PATH without duplicates
function _prepend_path() {
	if ! $(echo "$PATH" | tr ":" "\n" | grep -qx "$1"); then
		PATH="$1:$PATH"
	fi
}

# Extend $PATH
[ -d /usr/local/bin ] && _prepend_path "/usr/local/bin"
[ -d /usr/local/opt/ruby/bin ] && _prepend_path "/usr/local/opt/ruby/bin"
[ -d /opt/homebrew/bin ] && _prepend_path "/opt/homebrew/bin"
[ -d ~/dotfiles/bin ] && _prepend_path "$HOME/dotfiles/bin"
[ -d ~/bin ] && _prepend_path "$HOME/bin"
_prepend_path "./node_modules/.bin" # Run locally installed Node.js binaries directly
export PATH
