# Remove "Welcome to fish" message
set fish_greeting

# Disable path shortening in prompt
set fish_prompt_pwd_dir_length 0

source ~/.config/fish/env.fish
source ~/.config/fish/path.fish
source ~/.config/fish/aliases.fish
source ~/.config/fish/colors.fish

# Load extra (private) settings
if test -e "$HOME/.local.fish";
	source ~/.local.fish
end
