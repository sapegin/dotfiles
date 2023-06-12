# Caching autocompletion
# https://blog.callstack.io/supercharge-your-terminal-with-zsh-8b369d689770
autoload -Uz compinit
if [[ -n ~/.zcompdump(#qN.mh+24) ]]; then
  compinit -i
else
  compinit -C -i
fi

# Menu-like autocompletion selection
zmodload -i zsh/complist

# Automatically list choices on ambiguous completion
setopt auto_list
# Automatically use menu completion
setopt auto_menu
# Move cursor to end if word had one match
setopt always_to_end

# Select completions with arrow keys
zstyle ':completion:*' menu select
# Group results by category
zstyle ':completion:*' group-name ''
# Enable approximate matches for completion
zstyle ':completion:::::' completer _expand _complete _ignored _approximate
# Case and hyphen insensitive
zstyle ':completion:*' matcher-list 'm:{a-zA-Z-_}={A-Za-z_-}' 'r:|=*' 'l:|=* r:|=*'
# Use caching so that commands like apt and dpkg complete are useable
zstyle ':completion::complete:*' use-cache 1
zstyle ':completion::complete:*' cache-path $ZSH_CACHE_DIR

# Load default completions
autoload -Uz compinit && compinit

# Custom completions for Git scripts

__git_command_successful () {
    if (( ${#pipestatus:#0} > 0 )); then
        _message 'not a git repository'
        return 1
    fi
    return 0
}

__git_branch_names() {
    local expl
    declare -a branch_names
    branch_names=(${${(f)"$(_call_program branchrefs git for-each-ref --format='"%(refname)"' refs/heads 2>/dev/null)"}#refs/heads/})
    __git_command_successful || return
    _wanted branch-names expl branch-name compadd $* - $branch_names
}

compdef __git_branch_names branch br
