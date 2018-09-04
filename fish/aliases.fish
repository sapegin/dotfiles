# Navigation
function .. ; cd .. ; end
function ... ; cd ../.. ; end
function .... ; cd ../../.. ; end
function ..... ; cd ../../../.. ; end
abbr -a -- - 'cd -'

# Enable aliases to be sudo’ed
alias sudo="sudo "

# Shortcuts
alias o="open"
alias oo="open ."
alias e="$EDITOR"
alias -- +x="chmod +x"

# GitHub Desktop
alias gh="github"

# https://github.com/sindresorhus/trash-cli
alias rm="trash"

# https://github.com/sharkdp/bat
alias cat="bat"

# ForkLift
alias k="open -a ForkLift"
alias kk="open -a ForkLift ."

# Download file and save it with the filename of the remote file
alias get="curl -O -L"

# Run npm script without annoying noise
alias nr="npm run --silent"

# Jest watch
alias j="npx jest --watch"

# `cd` to Git repo root
alias gr='git rev-parse 2>/dev/null; and cd "./(git rev-parse --show-cdup)"'

# Gist
# gist-paste filename.ext -- create private Gist from the clipboard contents
alias gist-paste="gist --private --copy --paste --filename"
# gist-file filename.ext -- create private Gist from a file
alias gist-file="gist --private --copy"
