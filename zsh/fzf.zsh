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

