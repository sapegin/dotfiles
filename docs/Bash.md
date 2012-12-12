# Bash Aliases & Scripts

## Navigation

* *..* → cd ..

* *...* → cd ../..

* *....* → cd ../../..

* *.....* → cd ../../../..

* *~* → cd ~

* *-* → cd -


## Shortcuts

* *dr* → cd ~/Dropbox

* *pj* → cd ~/Dropbox/Projects

* *pjr* → cd ~/Dropbox/Projects/_Repos

* *pjf* → cd ~/Dropbox/Projects/_Forks

* *pjm* → cd ~/Dropbox/Projects/!

* *o* → open

* *oo* → open .

* *marked* → open -a marked

* *md <dir>* → Make directory and `cd` to it.

* *f <what>* → Recursively find file in current directory.

* *c* → Trim new lines and copy text to clipboard.


## File System

### extract <filepath> [directory]

Extract archives of various types.

### emptytrash

Empty the Trash on all mounted volumes and the main HDD. Also, clear Apple’s System Logs to improve shell startup speed.

### show / hide

Show/hide hidden files in Finder.


## Text

### dos2unix <filepath>

Convert file to Unix line endings.

### crlf [--force]

Find files with Windows line endings (and convert them to Unix when `--force` key given).

### escape <characters>

Escape UTF-8 characters into their 3-byte format: `£` → `\xC2\xA3`.

### codepoint <character>

Get a character’s Unicode code point: `£` → `\x00A3`.


## Network

### GET / HEAD / POST / PUT / DELETE / TRACE / OPTIONS <URL>
	
Make HTTP request using respective method.

### gz <filepath>

Get gzipped file size.

### httpcompression <URL>

Test if HTTP compression (RFC 2616 + SDCH) is enabled for a given URL. Send a fake UA string for sites that sniff it instead of using the Accept-Encoding header.

### ssh-key

Copy public SSH key to clipboard. Generate it if necessary.

### add-ssh-host <username> <hostname> <identifier>
	
Create an SSH key and uploads it to the given host.

### yay

Upload current directory to special directory on my hosting.

### mysql-dump <ssh_hostname> <mysql_database> [mysql_username] [mysql_host]

Backup remote MySQL database to `~/Backups/hostname/dbname_YYYY-MM-DD.sql.gz`.

### rasterize <URL> <filename>

Save page screenshot to file.


## NPM

### npm-patch / npm-release

Increment version (`npm-patch` by 0.0.1 and `npm-release` by 0.1.x) of NPM package and make Git commit.


## Grunt

### gw / gs

Run Grunt’s watch and server tasks:

gw → grunt deploy --debug && grunt watch --debug
gs → grunt deploy --debug && grunt serve --debug

### gi [template]

Just shortcut for `grunt-init`.


## Magic Project Opener

### proj / repo / wptheme [project]

Change current directory to project folder / Git repo / Wordpress theme forlder of given “project”. Use fuzzy search.


## Misc

### password [length]

Generate random password and copy it to clipboard. Default length is 8.

### path

Show $PATH in a readable way.

### dotfiles

Update dotfiles. Pull latest version from GitHub, syncronize symlinks and reread `~/.bashrc`.

### update

Get OS X software updates, update Homebrew, NPM, Ruby packages, dotfiles and some other software.

### nyan

Print nyan cat :-)
