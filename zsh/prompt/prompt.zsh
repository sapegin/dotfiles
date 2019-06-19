# Squirrelbook Zsh prompt using Spaceship
# https://github.com/denysdovhan/spaceship-prompt
#
# Inspired by: https://github.com/sindresorhus/pure
#
# Author: Artem Sapegin, sapegin.me
# License: MIT
# https://github.com/sapegin/dotfiles

source ~/dotfiles/zsh/prompt/sections/git_simple.zsh

SPACESHIP_PROMPT_ORDER=(
  user          # Username section
  dir           # Current directory section
  host          # Hostname section
  git_simple    # Custom Git section
  line_sep      # Line break
  jobs          # Background jobs indicator
  exit_code     # Exit code section
  char          # Prompt character
)
# Hide prefixes before prompt sections
SPACESHIP_PROMPT_PREFIXES_SHOW=false
SPACESHIP_CHAR_SYMBOL="❯"
SPACESHIP_CHAR_SUFFIX=" "
SPACESHIP_DIR_COLOR="white"
