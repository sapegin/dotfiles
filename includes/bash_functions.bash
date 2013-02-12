# Print cyan underlined header 
function header() {
	echo -e "$UNDERLINE$CYAN$1$NOCOLOR"
}

# Create a new directory and enter it
function md() {
	mkdir -p "$@" && cd "$@"
}

# Find shorthand
function f() {
	find . -name "$1" 2>/dev/null
}

# Compare original and gzipped file size
function gz() {
	local origsize=$(wc -c < "$1")
	local gzipsize=$(gzip -c "$1" | wc -c)
	local ratio=$(echo "$gzipsize * 100/ $origsize" | bc -l)
	printf "Original: %d bytes\n" "$origsize"
	printf "Gzipped: %d bytes (%2.2f%%)\n" "$gzipsize" "$ratio"
}

# Test if HTTP compression (RFC 2616 + SDCH) is enabled for a given URL.
# Send a fake UA string for sites that sniff it instead of using the Accept-Encoding header. (Looking at you, ajax.googleapis.com!)
function httpcompression() {
	encoding="$(curl -LIs -H 'User-Agent: Mozilla/5 Gecko' -H 'Accept-Encoding: gzip,deflate,compress,sdch' "$1" | grep '^Content-Encoding:')" && echo "$1 is encoded using ${encoding#* }" || echo "$1 is not using any encoding"
}

# Show HTTP headers for given URL
# Usage: headers <URL>
# https://github.com/rtomayko/dotfiles/blob/rtomayko/bin/headers
function headers() {
	curl -sv -H "User-Agent: Mozilla/5 Gecko" "$@" 2>&1 >/dev/null |
		grep -v "^\*" |
		grep -v "^}" |
		cut -c3-
}

# Escape UTF-8 characters into their 3-byte format
function escape() {
	printf "\\\x%s" $(printf "$@" | xxd -p -c1 -u)
	echo
}

# Get a character’s Unicode code point: £ → \x00A3
function codepoint() {
	perl -e "use utf8; print sprintf('\x%04X', ord(\"$@\"))"
	echo
}

# Remove screenshots from desktop
function cleandesktop() {
	header "Cleaning desktop..."
	for file in ~/Desktop/Screen\ Shot*.png; do
		unlink "$file"
	done
	echo
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
	echo
	echo -en $RED'-_-_-_-_-_-_-_'
	echo -e $NOCOLOR$BOLD',------,'$NOCOLOR
	echo -en $YELLOW'_-_-_-_-_-_-_-'
	echo -e $NOCOLOR$BOLD'|   /\_/\\'$NOCOLOR
	echo -en $GREEN'-_-_-_-_-_-_-'
	echo -e $NOCOLOR$BOLD'~|__( ^ .^)'$NOCOLOR
	echo -en $CYAN'-_-_-_-_-_-_-'
	echo -e $NOCOLOR$BOLD'""  ""'$NOCOLOR
	echo
}

# Copy public SSH key to clipboard. Generate it if necessary
ssh-key() {
	file="$HOME/.ssh/id_rsa.pub"
	if [ ! -f "$file" ]; then
		ssh-keygen -t rsa
	fi
	
	cat "$file" | c
	echo "Your public key copied to clipboard."
}

# Create an SSH key and uploads it to the given host
# Based on https://gist.github.com/1761938
add-ssh-host() {
	username=$1
	hostname=$2
	identifier=$3

	if [[ "$identifier" == "" ]] || [[ "$username" == "" ]] || [[ "$hostname" == "" ]]; then
		echo "Usage: configure_ssh_host <username> <hostname> <identifier>"
	else
		if [ ! -f "$HOME/.ssh/$identifier.id_rsa" ]; then
			ssh-keygen -f ~/.ssh/$identifier.id_rsa -C "$USER $(date +'%Y/%m%/%d %H:%M:%S')"
		fi

		if ! grep -Fxiq "host $identifier" "$HOME/.ssh/config"; then
			echo -e "Host $identifier\n\tHostName $hostname\n\tUser $username\n\tIdentityFile ~/.ssh/$identifier.id_rsa" >> ~/.ssh/config
		fi

		ssh $identifier 'mkdir -p .ssh && cat >> ~/.ssh/authorized_keys' < ~/.ssh/$identifier.id_rsa.pub

		tput bold; ssh -o PasswordAuthentication=no $identifier true && { tput setaf 2; echo "SSH key added."; } || { tput setaf 1; echo "Failure"; }; tput sgr0

		_ssh_reload_autocomplete
	fi
}

# Upload current directory to special directory on my hosting
function yay() {
	server="locum"
	dir=`basename "$(pwd)"`
	remote="~/projects/yay/$dir"
	url="http://yay.sapegin.me/$dir/"

	tar cp --exclude '.git' --exclude 'node_modules' . | gzip | ssh $server "mkdir -p "$remote"; gzip -cd | tar x -C "$remote""

	echo "Current directory uploaded to $url."
	if command -v pbcopy >/dev/null 2>&1; then
		echo -n "$url" | pbcopy
		echo "URL copied to clipboard."
	fi
}

# Find files with Windows line endings (and convert then to Unix in force mode)
# USAGE: crlf [file] [--force]
function crlf() {
	local force=

	# Single file
	if [ "$1" != "" ] && [ "$1" != "--force" ]; then
		[ "$2" == "--force" ] && force=1 || force=0
		_crlf_file $1 $force
		return
	fi

	# All files
	[ "$1" == "--force" ] && force=1 || force=0
	for file in $(find . -type f -not -path "*/.git/*" -not -path "*/node_modules/*" | xargs file | grep ASCII | cut -d: -f1); do
		_crlf_file $file $force
	done
}
function _crlf_file() {
	grep -q $'\x0D' "$1" && echo "$1" && [ $2 ] && dos2unix "$1"
}

# Backup remote MySQL database to ~/Backups/hostname/dbname_YYYY-MM-DD.sql.gz
# USAGE: mysql-dump <ssh_hostname> <mysql_database> [mysql_username] [mysql_host]
mysql-dump() {
	local ssh_hostname=$1
	local mysql_database=$2
	local mysql_username=$3
	local mysql_host=$4
	local location="$HOME/Backups"
	local suffix=$(date +'%Y-%m-%d')

	if [[ $ssh_hostname == "" ]] || [[ $mysql_database == "" ]]; then
		echo "Usage: mysql-dump <ssh_hostname> <mysql_database> [mysql_username] [mysql_host]"
	else
		header "Backing up $mysql_database@$ssh_hostname..."

		if [[ $mysql_username != "" ]]; then
			mysql_username="-u $mysql_username -p "
		fi

		if [[ $mysql_host != "" ]];	then
			mysql_host=" -h $mysql_host"
		fi

		# Ensure backup directory
		local backup_dir="$location/$ssh_hostname"
   		mkdir -p $backup_dir

		# Give the user a warning if the file already exists
		local basename=$mysql_database"_"$suffix
		local local_filepath="$backup_dir/$basename.sql.gz"
		if [ -f "$local_filepath" ]; then
		    echo -e $RED"WARNING: Backup file '$local_filepath' already exists.$NOCOLOR\nOwerwrite? (Y/N)"
		    read proceed

		    if [[ $proceed != "y" ]]; then
		    	return
		    fi
		fi

		ssh -C $ssh_hostname "mysqldump --opt --compress $mysql_username$mysql_database$mysql_host | gzip -c" > "$local_filepath"

		echo
		echo "Done: $local_filepath"
	fi
}

# Save page screenshot to file
# USAGE: rasterize <URL> <filename>
# Based on https://github.com/oxyc/dotfiles/blob/master/.bash/commands
function rasterize() {
	local url="$1"
	local filename="$2"
	if [[ $url == "" ]] || [[ $filename == "" ]]; then
		echo "Usage: rasterize <URL> <filename>"
	else
		header "Rasterizing $url..."

		[[ $url != http* ]] && url="http://$url"
		[[ $filename != *png ]] && filename="$filename.png"
		phantomjs <(echo "
			var page = new WebPage();
			page.viewportSize = { width: 1280 };
			page.open('$url', function (status) {
				if (status !== 'success') {
					console.log('Unable to load the address.');
					phantom.exit();
				}
				else {
					window.setTimeout(function() {
						page.render('$filename');
						phantom.exit();
					}, 1000);
				}
			});
		")

		echo "Screenshot saved to: $filename"
	fi
}

# Add special aliases that will copy result to clipboard (escape → escape+)
for cmd in password hex2hsl hex2rgb escape codepoint; do
	eval "function $cmd+() { $cmd \$@ | c; }"
done
