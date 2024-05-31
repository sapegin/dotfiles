# Enable aliases to be sudo’ed
alias sudo="sudo "

# Navigation
alias ..="cd .."
alias ...="cd ../.."
alias ....="cd ../../.."
alias .....="cd ../../../.."
alias -- -="cd -"

# Shortcuts
alias ls="ls --color"
alias -- +x="chmod +x"
alias o="open"
alias oo="open ."
alias e="$EDITOR"
alias cc="code ."

# GitHub Desktop
alias gh="github ."

# Lazygit
alias lg="lazygit --use-config-dir $HOME/dotfiles/lazygit"

# Nimble Commander
alias nn="open -a 'Nimble Commander' ."

# Bat: https://github.com/sharkdp/bat
command -v bat > /dev/null 2>&1 && alias cat="bat --style=plain"

# Exa: https://the.exa.website
command -v exa > /dev/null 2>&1 && alias ls="exa -a --no-user --no-time"

# trash: https://github.com/sindresorhus/macos-trash
command -v trash > /dev/null 2>&1 && alias rm="trash"

# Midnight Commander
command -v mc > /dev/null 2>&1 && command -v code > /dev/null 2>&1 && alias mc="EDITOR=code mc --nosubshell"

# Download file and save it with filename of remote file
alias get="curl -O -L"

# Make a directory and cd to it
take() {
	mkdir -p $@ && cd ${@:$#}
}

# cd into whatever is the forefront Finder window
cdf() {
	cd "$(osascript -e 'tell app "Finder" to POSIX path of (insertion location as alias)')"
}

# Magic Project Opener
j() {
	cd "$(~/dotfiles/bin/j $1)"
}

# Cd to Git repository root folder
gr() {
	cd "./$(git rev-parse --show-cdup 2> /dev/null)" 2> /dev/null
}

# git clone and cd to a repo directory
clone() {
	git clone $@
	if [ "$2" ]; then
		cd "$2"
	else
		cd $(basename "$1" .git)
	fi
	if [[ -r "./yarn.lock" ]]; then
		yarn
	elif [[ -r "./package-lock.json" ]]; then
		npm install
	fi
}
