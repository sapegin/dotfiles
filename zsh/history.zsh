# Save command history to disk
HISTFILE=$HOME/.zsh_history
HISTSIZE=100000
SAVEHIST=$HISTSIZE

# Remove older duplicate entries from history
setopt hist_ignore_all_dups
# Remove superfluous blanks from history items
setopt hist_reduce_blanks
# Don't store commands prefixed with a space
setopt hist_ignore_space
# Show command with history expansion to user before running it
setopt hist_verify
