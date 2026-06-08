# Load configs
source ~/dotfiles/zsh/env.zsh
source ~/dotfiles/zsh/path.zsh
source ~/dotfiles/zsh/aliases.zsh
source ~/dotfiles/zsh/completions.zsh
source ~/dotfiles/zsh/key-bindings.zsh

# Load plugins
source ~/dotfiles/zsh/plugins/zsh-shift-select.plugin.zsh

# Do not overwrite files when redirecting using ">". Note that you can still override this with ">|"
set -o noclobber

# Enable extended glob
setopt extendedglob

setopt interactive_comments

# Remove older duplicate entries from history
setopt hist_ignore_all_dups
# Remove superfluous blanks from history items
setopt hist_reduce_blanks
# Don't store commands prefixed with a space
setopt hist_ignore_space
# Show command with history expansion to user before running it
setopt hist_verify
# Hide the inverse "%" partial-line marker that cmux leaves above the prompt on
# session switch (standalone Ghostty doesn't show it).
setopt_if_exists no_prompt_sp

# Terminal title
DISABLE_AUTO_TITLE="true"
function _set_terminal_title() {
	local title="$(basename "$PWD")"
	if [[ -n $SSH_CONNECTION ]]; then
		title="$title \xE2\x80\x94 $HOSTNAME"
	fi
	echo -ne "\033];$title\007"
}
precmd_functions+=(_set_terminal_title)

# Save command history to disk
HISTFILE=$HOME/.zsh_history
HISTSIZE=100000
SAVEHIST=$HISTSIZE

# Enable fzf: https://github.com/junegunn/fzf
# Use fd (https://github.com/sharkdp/fd) to respect .gitignore
export FZF_DEFAULT_COMMAND='fd --type f'
export FZF_CTRL_T_COMMAND="$FZF_DEFAULT_COMMAND"
# Load theme
source ~/dotfiles/colors/fzf-squirrelsong-dark-dp.sh
# Use fd to respect .gitignore and exclude .git directory
_fzf_compgen_path() {
	fd --hidden --exclude ".git" . "$1"
}
_fzf_compgen_dir() {
	fd --type d --hidden --exclude ".git" . "$1"
}

# Init fzf
source <(fzf --zsh)

# Load extra (private) settings
[ -f ~/.zshlocal ] && source ~/.zshlocal

# Starship prompt
export STARSHIP_CONFIG=~/.starship.toml
eval "$(starship init zsh)"

# Enable zsh-fast-syntax-highlighting:
# https://github.com/zdharma-continuum/fast-syntax-highlighting
if [ -f /opt/homebrew/opt/zsh-fast-syntax-highlighting/share/zsh-fast-syntax-highlighting/fast-syntax-highlighting.plugin.zsh ]; then
 source /opt/homebrew/opt/zsh-fast-syntax-highlighting/share/zsh-fast-syntax-highlighting/fast-syntax-highlighting.plugin.zsh
fi
