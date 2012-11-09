# Create a new directory and enter it
function md() {
	mkdir -p "$@" && cd "$@"
}

# Get gzipped file size
function gz() {
	echo "Original size (bytes): "
	cat "$1" | wc -c
	echo "Gzipped size (bytes): "
	gzip -c "$1" | wc -c
}

# Test if HTTP compression (RFC 2616 + SDCH) is enabled for a given URL.
# Send a fake UA string for sites that sniff it instead of using the Accept-Encoding header. (Looking at you, ajax.googleapis.com!)
function httpcompression() {
	encoding="$(curl -LIs -H 'User-Agent: Mozilla/5 Gecko' -H 'Accept-Encoding: gzip,deflate,compress,sdch' "$1" | grep '^Content-Encoding:')" && echo "$1 is encoded using ${encoding#* }" || echo "$1 is not using any encoding"
}

# Escape UTF-8 characters into their 3-byte format
function escape() {
	printf "\\\x%s" $(printf "$@" | xxd -p -c1 -u)
	echo # newline
}

# Decode \x{ABCD}-style Unicode escape sequences
function unidecode() {
	perl -e "binmode(STDOUT, ':utf8'); print \"$@\""
	echo # newline
}

# Get a character’s Unicode code point
function codepoint() {
	perl -e "use utf8; print sprintf('U+%04X', ord(\"$@\"))"
	echo # newline
}

# Extract archives of various types
function extract() {
	if [ -f $1 ] ; then
		local dir_name=${1%.*}  # Filename without extension
		case $1 in
			*.tar.bz2)  tar xjf           $1 ;;
			*.tar.gz)   tar xzf           $1 ;;
			*.tar.xz)   tar Jxvf          $1 ;;
			*.tar)      tar xf            $1 ;;
			*.tbz2)     tar xjf           $1 ;;
			*.tgz)      tar xzf           $1 ;;
			*.bz2)      bunzip2           $1 ;;
			*.rar)      unrar x           $1 $2 ;;
			*.gz)       gunzip            $1 ;;
			*.zip)      unzip -d$dir_name $1 ;;
			*.Z)        uncompress        $1 ;;
			*)          echo "'$1' cannot be extracted via extract()" ;;
		esac
	else
		echo "'$1' is not a valid file"
	fi
}

# Print nyan cat
# https://github.com/steckel/Git-Nyan-Graph/blob/master/nyan.sh
# If you want big animated version: `telnet miku.acm.uiuc.edu`
function nyan() {
	e='\033'
	RESET="$e[0m"
	BOLD="$e[1m"
	CYAN="$e[0;96m"
	RED="$e[0;91m"
	YELLOW="$e[0;93m"
	GREEN="$e[0;92m"
	echo
	echo -en $RED'-_-_-_-_-_-_-_'
	echo -e $RESET$BOLD',------,'$RESET
	echo -en $YELLOW'_-_-_-_-_-_-_-'
	echo -e $RESET$BOLD'|   /\_/\\'$RESET
	echo -en $GREEN'-_-_-_-_-_-_-'
	echo -e $RESET$BOLD'~|__( ^ .^)'$RESET
	echo -en $CYAN'-_-_-_-_-_-_-'
	echo -e $RESET$BOLD'""  ""'$RESET
	echo
}
