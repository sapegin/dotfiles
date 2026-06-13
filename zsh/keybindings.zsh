# Key bindings
#
# List all keybindings:
#   bindkey
#
# Find escape sequences:
#   cat

# Delete
# https://blog.pilif.me/2004/10/21/delete-key-in-zsh/
bindkey '^[[3~' delete-char
bindkey '^[3;5~' delete-char

# History search with arrow keys
# https://coderwall.com/p/jpj_6q/zsh-better-history-searching-with-arrow-keys
autoload -U up-line-or-beginning-search down-line-or-beginning-search
zle -N up-line-or-beginning-search
zle -N down-line-or-beginning-search

# Shift-selection leaves REGION_ACTIVE set; unmodified movement must clear it first

_deactivate-and-call() {
	emulate -L zsh
	local movement=$1
	(( REGION_ACTIVE )) && zle deactivate-region -w
	zle $movement -w
}

up-line-or-beginning-search-unselect() { _deactivate-and-call up-line-or-beginning-search }
zle -N up-line-or-beginning-search-unselect
bindkey "^[[A" up-line-or-beginning-search-unselect

down-line-or-beginning-search-unselect() { _deactivate-and-call down-line-or-beginning-search }
zle -N down-line-or-beginning-search-unselect
bindkey "^[[B" down-line-or-beginning-search-unselect

backward-char-unselect() { _deactivate-and-call backward-char }
zle -N backward-char-unselect
bindkey '^[[D' backward-char-unselect

forward-char-unselect() { _deactivate-and-call forward-char }
zle -N forward-char-unselect
bindkey '^[[C' forward-char-unselect

beginning-of-line-unselect() { _deactivate-and-call beginning-of-line }
zle -N beginning-of-line-unselect
bindkey "^[[H" beginning-of-line-unselect

end-of-line-unselect() { _deactivate-and-call end-of-line }
zle -N end-of-line-unselect
bindkey "^[[F" end-of-line-unselect

# Shift+Enter to insert a newline (Ghostty)
shift-enter-newline() { LBUFFER+=$'\n'; }
zle -N shift-enter-newline
bindkey '^[[27;2;13~' shift-enter-newline

# macOS-like shift selection in the command line. Ghostty sends CSI sequences
_select-move() {
	emulate -L zsh
	local movement=$1
	(( REGION_ACTIVE )) || zle set-mark-command -w
	zle $movement -w
}

# Shift + Arrow — select by character

select-backward-char() { _select-move backward-char }
zle -N select-backward-char
bindkey '^[[1;2D' select-backward-char

select-forward-char() { _select-move forward-char }
zle -N select-forward-char
bindkey '^[[1;2C' select-forward-char

# Shift + Option + Arrow — select by word

select-backward-word() { _select-move backward-word }
zle -N select-backward-word
bindkey '^[[1;4D' select-backward-word

select-forward-word() { _select-move forward-word }
zle -N select-forward-word
bindkey '^[[1;4C' select-forward-word

# Shift + Cmd + Arrow — select to line start/end

select-backward-line() { _select-move beginning-of-line }
zle -N select-backward-line
bindkey '^[[1;10D' select-backward-line

select-forward-line() { _select-move end-of-line }
zle -N select-forward-line
bindkey '^[[1;10C' select-forward-line

# Paste highlights inserted text by default; disable the faux selection
typeset -ga ZLE_HIGHLIGHT
zle_highlight=(paste:none)

# set-mark-command leaves the cursor at a selection edge; kill the region before
# insert
self-insert-replace-selection() {
	emulate -L zsh
	if (( REGION_ACTIVE )); then
		zle kill-region -w
	fi
	zle .self-insert -w
}
zle -N self-insert self-insert-replace-selection
