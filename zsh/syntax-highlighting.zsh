# Syntax highlighting
# https://github.com/zdharma-continuum/fast-syntax-highlighting
# Must load after other ZLE hooks (fzf, completions, shift-select, etc.)
fast_syntax_highlighting_path="$(brew --prefix zsh-fast-syntax-highlighting 2>/dev/null)/share/zsh-fast-syntax-highlighting/fast-syntax-highlighting.plugin.zsh"
[[ -f $fast_syntax_highlighting_path ]] && source $fast_syntax_highlighting_path
