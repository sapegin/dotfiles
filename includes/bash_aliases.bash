# Easier navigation: .., ..., ...., ....., ~ and -
alias ..="cd .."
alias ...="cd ../.."
alias ....="cd ../../.."
alias .....="cd ../../../.."
alias ~="cd ~"
alias -- -="cd -"  # The alias is `-`, not `--`

# Shortcuts
alias dr="cd ~/Dropbox"
#alias dl="cd ~/Downloads"
#alias dt="cd ~/Desktop"
alias pj="cd ~/Dropbox/Projects"
alias o="open"
alias oo="open ."

# Detect which `ls` flavor is in use
if ls --color > /dev/null 2>&1; then  # GNU `ls`
	colorflag="--color"
else  # OS X `ls`
	colorflag="-G"
fi

# Always use color output for `ls`
alias ls="command ls ${colorflag}"
export LS_COLORS='no=00:fi=00:di=01;34:ln=01;36:pi=40;33:so=01;35:do=01;35:bd=40;33;01:cd=40;33;01:or=40;31;01:ex=01;32:*.tar=01;31:*.tgz=01;31:*.arj=01;31:*.taz=01;31:*.lzh=01;31:*.zip=01;31:*.z=01;31:*.Z=01;31:*.gz=01;31:*.bz2=01;31:*.deb=01;31:*.rpm=01;31:*.jar=01;31:*.jpg=01;35:*.jpeg=01;35:*.gif=01;35:*.bmp=01;35:*.pbm=01;35:*.pgm=01;35:*.ppm=01;35:*.tga=01;35:*.xbm=01;35:*.xpm=01;35:*.tif=01;35:*.tiff=01;35:*.png=01;35:*.mov=01;35:*.mpg=01;35:*.mpeg=01;35:*.avi=01;35:*.fli=01;35:*.gl=01;35:*.dl=01;35:*.xcf=01;35:*.xwd=01;35:*.ogg=01;35:*.mp3=01;35:*.wav=01;35:'

# Enable aliases to be sudo’ed
alias sudo='sudo '

# Avoid stupidity
alias rm="rm -i"

# Gzip-enabled `curl`
#alias gurl="curl --compressed"

# Get OS X Software Updates, and update installed Ruby gems, Homebrew, npm, and their installed packages
alias update='sudo softwareupdate -i -a; brew update; brew upgrade; brew cleanup; npm update npm -g; npm update -g; sudo gem update'

# Clean up LaunchServices to remove duplicates in the “Open With” menu
#alias lscleanup="/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -kill -r -domain local -domain system -domain user && killall Finder"

# Trim new lines and copy to clipboard
alias c="tr -d '\n' | pbcopy"

# Recursively delete `.DS_Store` files
#alias cleanup="find . -type f -name '*.DS_Store' -ls -delete"

# Empty the Trash on all mounted volumes and the main HDD
# Also, clear Apple’s System Logs to improve shell startup speed
alias emptytrash="sudo rm -rfv /Volumes/*/.Trashes; sudo rm -rfv ~/.Trash; sudo rm -rfv /private/var/log/asl/*.asl"

# Show/hide hidden files in Finder
alias show="defaults write com.apple.Finder AppleShowAllFiles -bool true && killall Finder"
alias hide="defaults write com.apple.Finder AppleShowAllFiles -bool false && killall Finder"

# URL-encode strings
#alias urlencode='python -c "import sys, urllib as ul; print ul.quote_plus(sys.argv[1]);"'

# Ring the terminal bell, and put a badge on Terminal.app’s Dock icon
# (useful when executing time-consuming commands)
#alias badge="tput bel"

# HTTP requests by @janmoesen
for method in GET HEAD POST PUT DELETE TRACE OPTIONS; do
	alias "$method"="lwp-request -m '$method'"
done

# Convert line endings to UNIX
alias dos2unix="perl -pi -e 's/\r\n?/\n/g' "

# Password generator
password() { openssl rand -base64 ${1:-8} | c; }

# Git root
alias gr='[ ! -z `git rev-parse --show-cdup` ] && cd `git rev-parse --show-cdup || pwd`'

# NPM
alias npm-patch='npm version patch -m "%s"'
alias npm-release='npm version minor -m "%s"'

# Grunt
alias gw="grunt deploy --debug && grunt watch --debug"
ginit() { grunt init:$@; }

# Magic Project Opener
function proj { cd "$("$HOME/dotfiles/bin/opener.py" "$HOME/Dropbox/Projects" $1 -w project $2)"; }
function repo { cd "$("$HOME/dotfiles/bin/opener.py" "$HOME/Dropbox/Projects" $1 -w repo $2)"; }
function wptheme { cd "$("$HOME/dotfiles/bin/opener.py" "$HOME/Dropbox/Projects" $1 -w wptheme $2)"; }
 