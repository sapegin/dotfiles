# Syntax highlighting
# https://github.com/zdharma-continuum/fast-syntax-highlighting
# Must load after other ZLE hooks (fzf, completions, shift-select, etc.)
FAST_HIGHLIGHT_INI="$HOME/dotfiles/colors/fast-syntax-highlighting-squirrelsong.ini"
fast_syntax_highlighting_path="$(brew --prefix zsh-fast-syntax-highlighting 2>/dev/null)/share/zsh-fast-syntax-highlighting/fast-syntax-highlighting.plugin.zsh"
[[ -f $fast_syntax_highlighting_path ]] || return

source $fast_syntax_highlighting_path
