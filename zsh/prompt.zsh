# Set terminal title to the current directory basename
function set_win_title() {
  echo -ne "\033]0;$(basename "$PWD")\007"
}
precmd_functions+=(set_win_title)
chpwd_functions+=(set_win_title)

# Init Starship prompt
eval "$(starship init zsh)"
