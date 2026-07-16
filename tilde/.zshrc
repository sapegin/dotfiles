source "$HOME/dotfiles/zsh/dirs.zsh"

source "$DOTFILES_DIR/zsh/env.zsh"
source "$DOTFILES_DIR/zsh/path.zsh"
source "$DOTFILES_DIR/zsh/options.zsh"
source "$DOTFILES_DIR/zsh/history.zsh"
source "$DOTFILES_DIR/zsh/prompt.zsh"
source "$DOTFILES_DIR/zsh/aliases.zsh"
source "$DOTFILES_DIR/zsh/completions.zsh"
source "$DOTFILES_DIR/zsh/keybindings.zsh"
source "$DOTFILES_DIR/zsh/fzf.zsh"

# Load extra (private) settings
[ -f ~/.zshlocal ] && source ~/.zshlocal

source "$DOTFILES_DIR/zsh/patina.zsh"
