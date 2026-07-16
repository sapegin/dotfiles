# Fzf
# https://github.com/junegunn/fzf

# Load theme
source "$THEMES_DIR/Zsh/fzf/fzf-squirrelsong-${TERM_THEME}.sh"

export FZF_DEFAULT_OPTS="\
--color '$FZF_COLORS' \
--border='rounded' \
--border-label='' \
--preview-window='border-rounded' \
--prompt=' ' \
--marker='' \
--pointer='' \
--separator='─' \
--scrollbar='│' \
--info='right' \
"

# Use fd (https://github.com/sharkdp/fd) to respect .gitignore but include
# hidden files
export FZF_DEFAULT_COMMAND='fd --type f --hidden --exclude .git'

# Preview file content using bat (https://github.com/sharkdp/bat)
export FZF_CTRL_T_OPTS="--preview 'bat -n --color=always {}'"

# Enable completion on **<TAB>
export FZF_COMPLETION_TRIGGER='**'

# Use fd to respect .gitignore and exclude .git directory
_fzf_compgen_path() {
	fd --hidden --exclude ".git" . "$1"
}

# Use fd to generate the list for directory completion
_fzf_compgen_dir() {
  fd --type d --hidden --exclude ".git" . "$1"
}

# Init fzf
source <(fzf --zsh)
