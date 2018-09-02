# Remove "Welcome to fish" message
set fish_greeting

source ~/.config/fish/env.fish
source ~/.config/fish/path.fish
source ~/.config/fish/aliases.fish
source ~/.config/fish/colors.fish

# Load extra (private) settings
if test -e "$HOME/.local.fish";
	source ~/.local.fish
end
