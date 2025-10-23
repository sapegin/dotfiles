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
# Squirrelsong Dark Deep Purple theme colors
export FZF_DEFAULT_OPTS='
  --color=fg:-1,fg+:#bea3d9,bg:-1,bg+:#bea3d9
  --color=hl:#ca5a83,hl+:#97576f,info:#7254a6,marker:#ceb250
  --color=prompt:#7254a6,spinner:#bea3d9,pointer:#bea3d9,header:#e9d6fa
  --color=border:#644e88,label:#bea3d9,query:#e9d6fa,disabled:#7254a6
  --border="rounded" --border-label="" --preview-window="border-rounded" --prompt="> "
  --marker=">" --pointer="▪︎" --separator="─" --scrollbar="│"
  --info="right"'
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

# Enable zsh-syntax-highlighting: https://github.com/zsh-users/zsh-syntax-highlighting
# Custom colors
typeset -A ZSH_HIGHLIGHT_STYLES
ZSH_HIGHLIGHT_STYLES[reserved-word]='fg=magenta,bold'
ZSH_HIGHLIGHT_STYLES[function]='fg=cyan,bold'
ZSH_HIGHLIGHT_STYLES[command]='fg=cyan,bold'
ZSH_HIGHLIGHT_STYLES[alias]='fg=cyan,bold'
ZSH_HIGHLIGHT_STYLES[builtin]='fg=cyan,bold'
ZSH_HIGHLIGHT_STYLES[commandseparator]='fg=cyan,bold'
ZSH_HIGHLIGHT_STYLES[redirection]='fg=cyan,bold'
ZSH_HIGHLIGHT_STYLES[globbing]='fg=magenta,bold'
ZSH_HIGHLIGHT_STYLES[back-quoted-argument]='fg=green'
ZSH_HIGHLIGHT_STYLES[single-quoted-argument]='fg=green'
ZSH_HIGHLIGHT_STYLES[double-quoted-argument]='fg=green'
ZSH_HIGHLIGHT_STYLES[dollar-quoted-argument]='fg=green'
ZSH_HIGHLIGHT_STYLES[single-hyphen-option]='fg=magenta'
ZSH_HIGHLIGHT_STYLES[double-hyphen-option]='fg=magenta'
ZSH_HIGHLIGHT_STYLES[arithmetic-expansion]='fg=yellow'
ZSH_HIGHLIGHT_STYLES[dollar-double-quoted-argument]='fg=blue'
ZSH_HIGHLIGHT_STYLES[back-double-quoted-argument]='fg=green,bold'
ZSH_HIGHLIGHT_STYLES[back-dollar-quoted-argument]='fg=green,bold'
ZSH_HIGHLIGHT_STYLES[assign]='fg=blue'
ZSH_HIGHLIGHT_STYLES[comment]='fg=black'
# Load zsh-syntax-highlighting
if [ -f /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh ]; then
  source /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
fi
