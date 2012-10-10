# NPM
alias npm-patch='npm version patch -m "Version %s"'
alias npm-release='npm version minor -m "Version %s"'

# Grunt
alias gw="grunt watch --debug"
ginit() { grunt init:$@ ;}

# Convert line endings to UNIX
alias dos2unix="perl -pi -e 's/\r\n?/\n/g' "

# Tools
source ~/dotfiles/tools/root.sh