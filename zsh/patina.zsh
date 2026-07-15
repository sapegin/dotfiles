# Syntax highlighting
# https://github.com/michel-kraemer/zsh-patina
# Must load after other ZLE hooks (fzf, completions, shift-select, etc.)
command -v zsh-patina > /dev/null 2>&1 || return
eval "$(zsh-patina activate)"
