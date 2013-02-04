# Inspired by: https://github.com/dreadatour/dotfiles/blob/master/.bash_profile

# User color
case $(id -u) in
	0) USER_COLOR=$RED ;;  # root
	*) USER_COLOR=$GREEN ;;
esac

# Some kind of optimization - check if Git installed only on config load
PS1_GIT_BIN=$(which git 2>/dev/null)

function prompt_command() {
	local PS1_GIT=
	local GIT_BRANCH=
	local GIT_DIRTY=
	local PWDNAME="$PWD"

	# Local or SSH session?
	local remote=
	[ -n "$SSH_CLIENT" ] || [ -n "$SSH_TTY" ] && remote=1

	# Beautify working directory name
	if [ "$HOME" == "$PWD" ]; then
		PWDNAME="~"
	elif [ "$HOME" == "${PWD:0:${#HOME}}" ]; then
		PWDNAME="~${PWD:${#HOME}}"
	fi

	# Parse Git status and get Git variables
	if [[ ! -z "$PS1_GIT_BIN" ]]; then
		# Check if we are in Git repo
		local CUR_DIR="$PWD"
		while [[ ! -d "$CUR_DIR/.git" ]] && [[ ! "$CUR_DIR" == "/" ]] && [[ ! "$CUR_DIR" == "~" ]] && [[ ! "$CUR_DIR" == "" ]]; do CUR_DIR="${CUR_DIR%/*}"; done
		if [[ -d "$CUR_DIR/.git" ]]; then
			# Get Git branch
			GIT_BRANCH="$($PS1_GIT_BIN symbolic-ref HEAD 2>/dev/null)"
			if [[ ! -z "$GIT_BRANCH" ]]; then
				GIT_BRANCH="${GIT_BRANCH#refs/heads/}"

				# Get Git status
				local GIT_STATUS="$($PS1_GIT_BIN status --porcelain 2>/dev/null)"
				[[ -n "$GIT_STATUS" ]] && GIT_DIRTY=1
			fi
		fi
	fi

	# Build B&W prompt for Git
	[[ ! -z "$GIT_BRANCH" ]] && PS1_GIT=" #$GIT_BRANCH"

	# Calculate prompt length
	local host_length=0
	[ -n "$remote" ] && host_length=$((${#HOSTNAME}+1))
	local PS1_length=$((${#USER}+${#PWDNAME}+${#PS1_GIT}+$host_length+2))
	local FILL=

	# If length is greater, than terminal width
	if [[ $PS1_length -gt $COLUMNS ]]; then
		# Strip working directory name
		PWDNAME="...${PWDNAME:$(($PS1_length-$COLUMNS+3))}"
	else
		# Calculate fillsize
		local fillsize=$(($COLUMNS-$PS1_length))
		FILL=$GRAY
		while [[ $fillsize -gt 0 ]]; do FILL=$FILL"─"; fillsize=$(($fillsize-1)); done
		FILL=$FILL$NOCOLOR
	fi

	# Git status for prompt
	if [ ! -z "$GIT_BRANCH" ]; then
		local BRANCH_COLOR=$GREEN
		[ ! -z $GIT_DIRTY ] && BRANCH_COLOR=$RED
		PS1_GIT=" #$BRANCH_COLOR$GIT_BRANCH$NOCOLOR"
	fi

	# Set new color prompt
	local host_prompt=
	[ -n "$remote" ] && host_prompt="@$YELLOW$HOSTNAME$NOCOLOR" 
	PS1="$USER_COLOR$USER$NOCOLOR$host_prompt:$WHITE$PWDNAME$NOCOLOR$PS1_GIT $FILL\n→ "

	# Terminal title
	local TITLE=$(basename $PWDNAME)
	[ -n "$SSH_CLIENT" ] || [ -n "$SSH_TTY" ] && TITLE="$TITLE \xE2\x80\x94 $HOSTNAME"
	echo -ne "\033]0;$TITLE"; echo -ne "\007"
}

# Set prompt command (title update and color prompt)
PROMPT_COMMAND=prompt_command
# Set new B&W prompt (will be overwritten in `prompt_command` later with color prompt)
PS1='\u@\h:\w\$ '
