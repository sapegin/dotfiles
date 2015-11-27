# Enable aliases to be sudo’ed
alias sudo="sudo "

alias o="open"
alias oo="open ."
alias e="$EDITOR"
alias gh="github"
alias x+="chmod +x"
alias -- +x="chmod +x"

# Trim new lines and copy to clipboard
alias c="tr -d '\n' | pbcopy"

# cd into whatever is the forefront Finder window
cdf() { cd "`osascript -e 'tell app "Finder" to POSIX path of (insertion location as alias)'`"; }

# Update dotfiles
alias dotfiles="pushd "$HOME/dotfiles" > /dev/null 2>&1; git pull && ./sync.py && source "$HOME/.zshrc"; popd > /dev/null 2>&1; nyan"

# Magic Project Opener
repo() { cd "$("$HOME/dotfiles/bin/repo" $1)"; }

# Empty the Trash on all mounted volumes and the main HDD
# Also, clear Apple’s System Logs to improve shell startup speed
alias emptytrash="sudo rm -rfv /Volumes/*/.Trashes; sudo rm -rfv $HOME/.Trash; sudo rm -rfv /private/var/log/asl/*.asl"

# Convert line endings to UNIX
alias dos2unix="perl -pi -e 's/\r\n?/\n/g'"

# My IP
alias myip="ifconfig | grep 'inet ' | grep -v 127.0.0.1 | awk '{print \$2}'"

# Download file and save it with filename of remote file
alias get="curl -O -L"

# HTTP requests by @janmoesen
for method in GET HEAD POST PUT DELETE TRACE OPTIONS; do
	alias "$method"="lwp-request -m '$method'"
done

# Restart Linux service
rstrt() { sudo service $@ restart; }

# github.com/harthur/replace
alias replace="replace --exclude='node_modules'"

# Grunt
alias gw="grunt watch --stack --debug"
alias gww="grunt browserSync watch --stack --debug"

# Tâmia generator
tm() { yo tamia:$@; }

# Push and deploy using Shipit
alias pff="push && shipit"

# `cd` to Git repo root
alias gr='git rev-parse 2>/dev/null && cd "./$(git rev-parse --show-cdup)"'

# Gist
alias gist-paste="gist --private --copy --paste --filename"  # gist-paste filename.ext -- create private Gist from the clipboard contents
alias gist-file="gist --private --copy"  # gist-file filename.ext -- create private Gist from a file
