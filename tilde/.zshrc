# Load configs
source ~/dotfiles/zsh/env.zsh
source ~/dotfiles/zsh/path.zsh
source ~/dotfiles/zsh/options.zsh
source ~/dotfiles/zsh/prompt.zsh
source ~/dotfiles/zsh/aliases.zsh
source ~/dotfiles/zsh/completions.zsh
source ~/dotfiles/zsh/key-bindings.zsh
source ~/dotfiles/zsh/fzf.zsh

# Load plugins
source ~/dotfiles/zsh/plugins/zsh-shift-select.plugin.zsh

# Save command history to disk
HISTFILE=$HOME/.zsh_history
HISTSIZE=100000
SAVEHIST=$HISTSIZE

# Load extra (private) settings
[ -f ~/.zshlocal ] && source ~/.zshlocal

# Enable zsh-fast-syntax-highlighting:
# https://github.com/zdharma-continuum/fast-syntax-highlighting
if [ -f /opt/homebrew/opt/zsh-fast-syntax-highlighting/share/zsh-fast-syntax-highlighting/fast-syntax-highlighting.plugin.zsh ]; then
 source /opt/homebrew/opt/zsh-fast-syntax-highlighting/share/zsh-fast-syntax-highlighting/fast-syntax-highlighting.plugin.zsh
fi
