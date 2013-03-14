# Easier navigation
alias ..="cd .."
alias ...="cd ../.."
alias ....="cd ../../.."
alias .....="cd ../../../.."
alias ~="cd ~"
alias -- -="cd -"  # The alias is `-`, not `--`

# Shortcuts
alias dr="cd ~/Dropbox"
alias pj="cd ~/Dropbox/Projects"
alias pjr="cd ~/Dropbox/Projects/_Repos"
alias pjf="cd ~/Dropbox/Projects/_Forks"
alias pjm="cd ~/Dropbox/Projects/!"
alias o="open"
alias oo="open ."
alias e="subl"
alias gh="github"
alias +x="chmod +x"
alias x+="chmod +x"
alias g="ack -ri"

# Detect which `ls` flavor is in use
if ls --color > /dev/null 2>&1; then  # GNU `ls`
	colorflag="--color"
else  # OS X `ls`
	colorflag="-G"
fi

# Always use color output for `ls`
alias ls="command ls ${colorflag}"
export LS_COLORS="no=00:fi=00:di=01;34:ln=01;36:pi=40;33:so=01;35:do=01;35:bd=40;33;01:cd=40;33;01:or=40;31;01:ex=01;32:*.tar=01;31:*.tgz=01;31:*.arj=01;31:*.taz=01;31:*.lzh=01;31:*.zip=01;31:*.z=01;31:*.Z=01;31:*.gz=01;31:*.bz2=01;31:*.deb=01;31:*.rpm=01;31:*.jar=01;31:*.jpg=01;35:*.jpeg=01;35:*.gif=01;35:*.bmp=01;35:*.pbm=01;35:*.pgm=01;35:*.ppm=01;35:*.tga=01;35:*.xbm=01;35:*.xpm=01;35:*.tif=01;35:*.tiff=01;35:*.png=01;35:*.mov=01;35:*.mpg=01;35:*.mpeg=01;35:*.avi=01;35:*.fli=01;35:*.gl=01;35:*.dl=01;35:*.xcf=01;35:*.xwd=01;35:*.ogg=01;35:*.mp3=01;35:*.wav=01;35:"

# Enable aliases to be sudo’ed
alias sudo="sudo "

# Avoid stupidity
alias rm="rm -i"

# Gzip-enabled `curl`
#alias gurl="curl --compressed"

# Software/libraries update
alias update="source "$HOME/dotfiles/setup/update.sh""

# Update dotfiles
alias dotfiles="pushd "$HOME/dotfiles" > /dev/null 2>&1; git pull && ./sync.py && . "$HOME/.bashrc"; popd > /dev/null 2>&1; nyan"

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

# Ring the terminal bell, and put a badge on Terminal.app’s Dock icon (useful when executing time-consuming commands)
alias badge="tput bel"

# HTTP requests by @janmoesen
for method in GET HEAD POST PUT DELETE TRACE OPTIONS; do
	alias "$method"="lwp-request -m '$method'"
done

# Download file and save it with filename of remote file
alias get="curl -O"

# Convert line endings to UNIX
# tr -d '\015'
alias dos2unix="perl -pi -e 's/\r\n?/\n/g'"

# Password generator
password() { openssl rand -base64 ${1:-8}; }

# Show $PATH in a readable way
alias path='echo -e ${PATH//:/\\n}'

# Say what’s in the clipboard
alias sayit="pbpaste | say"

# NPM
alias npm-patch='npm version patch -m "%s"'
alias npm-release='npm version minor -m "%s"'

# Grunt
alias gw="grunt watch --debug"
alias gs="grunt connect watch --debug"
gi() { grunt-init $@; }

# Virtualenv
alias venv='test -d ENV && source ./ENV/bin/activate || echo "No Virtualenv in the current folder."'
alias venv-init='test -d ENV && echo "Virtualenv already exists." || virtualenv --no-site-packages ENV; venv'

# Magic Project Opener
function proj { cd "$("$HOME/dotfiles/bin/opener.py" "$HOME/Dropbox/Projects" $1 -w project $2)"; }
function repo { cd "$("$HOME/dotfiles/bin/opener.py" "$HOME/Dropbox/Projects" $1 -w repo $2)"; }
function wptheme { cd "$("$HOME/dotfiles/bin/opener.py" "$HOME/Dropbox/Projects" $1 -w wptheme $2)"; }

# Color conversion
alias hex2hsl="color.js $1 $2"
alias hex2rgb="color.js --rgb $1 $2"

# Dotfiles help
alias dot-bash="killall Marked; open -a marked --args $HOME/dotfiles/docs/Bash.md"
alias dot-git="killall Marked; open -a marked --args $HOME/dotfiles/docs/Git.md"
alias dot-hub="killall Marked; find /usr/local/Cellar/hub/ -name README.md -exec open -a marked --args {} \;"
#alias dot-extras="killall Marked; find /usr/local/Cellar/git-extras/ -name README.md -exec open -a marked --args {} \;"
alias dot-extras="open https://github.com/visionmedia/git-extras/blob/master/Readme.md#readme"
