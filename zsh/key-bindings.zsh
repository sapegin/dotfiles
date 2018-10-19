# Delete: https://blog.pilif.me/2004/10/21/delete-key-in-zsh/
bindkey '^[[3~' delete-char
bindkey '^[3;5~' delete-char

# Home/end: https://stackoverflow.com/a/8645267/1973105
bindkey "^[[H" beginning-of-line
bindkey "^[[F" end-of-line

# History search with arrow keys: https://coderwall.com/p/jpj_6q/zsh-better-history-searching-with-arrow-keys
autoload -U up-line-or-beginning-search
zle -N up-line-or-beginning-search
bindkey "^[[A" up-line-or-beginning-search
autoload -U down-line-or-beginning-search
zle -N down-line-or-beginning-search
bindkey "^[[B" down-line-or-beginning-search
