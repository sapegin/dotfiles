# Cache directory, create if necessary
ZSH_CACHE_DIR="$HOME/.cache/zsh"
[[ -d "$ZSH_CACHE_DIR" ]] || mkdir -p "$ZSH_CACHE_DIR"

# Load default completions
autoload -Uz compinit

# Caching autocompletion
# https://blog.callstack.io/supercharge-your-terminal-with-zsh-8b369d689770
local zcompdump="$ZSH_CACHE_DIR/zcompdump-$ZSH_VERSION"
if [[ -n ${zcompdump}(#qN.mh+24) ]]; then
  compinit -C -i -d "$zcompdump"
else
  compinit -i -d "$zcompdump"
fi

# Menu-like autocompletion selection
zmodload -i zsh/complist

# Menu selection: open on 2+ matches, type to filter (interactive mode)
zstyle ':completion:*' menu select=2 interactive
# Never dump matches to the terminal; the menu handles display
zstyle ':completion:*' list-max -1
# Git checkout: skip remotes, working-tree files, and commit hashes.
# `git co` only needs local branches; remotes alone can exceed LISTMAX.
zstyle ':completion:*:*:git-checkout:*' tag-order \
  'recent-branches' 'heads-local' 'branch-names' \
  '-remote-branch-names-noprefix' '-modified-files' '-commits'
# Avoid verbose _describe listing for large branch sets
zstyle ':completion:*:git-checkout:*' max-verbose 0
# Group results by category
zstyle ':completion:*' group-name ''
# Enable approximate matches for completion
zstyle ':completion:*' completer _expand _complete _ignored _approximate
# Case and hyphen insensitive
zstyle ':completion:*' matcher-list 'm:{a-zA-Z-_}={A-Za-z_-}' 'r:|=*' 'l:|=* r:|=*'
# Use caching so that commands like apt and dpkg complete are useable
zstyle ':completion::complete:*' use-cache 1
zstyle ':completion::complete:*' cache-path $ZSH_CACHE_DIR

# Custom completions for Git scripts
_br() {
  git rev-parse --show-toplevel &>/dev/null || { _message 'Not a Git repository'; return 1 }

  local -a branches
  branches=(${(f)"$(git for-each-ref --format='%(refname:short)' refs/heads 2>/dev/null)"})
  _arguments \
    '-d[Delete merged branch]' \
    '-D[Delete branch (force)]' \
    '1:branch:($branches)' \
    '2:branch:($branches)'
}
compdef _br br
