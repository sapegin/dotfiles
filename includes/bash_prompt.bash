# Inspired by: https://github.com/dreadatour/dotfiles/blob/master/.bash_profile & https://github.com/sindresorhus/pure

# Add to ~/.bashlocal user name you don’t want to see in the prompt: `local_username="admin"`

# User color
case $(id -u) in
	0) user_color="$RED" ;;  # root
	*) user_color="$GREEN" ;;
esac

# Prompt symbol
prompt_symbol="❯"

function prompt_command() {
	# Local or SSH session?
	local remote=
	[ -n "$SSH_CLIENT" ] || [ -n "$SSH_TTY" ] && remote=1

	# Working directory name
	local dir_name="$PWD"
	if [ "$HOME" == "$PWD" ]; then
		dir_name="~"
	elif [ "$HOME" == "${PWD:0:${#HOME}}" ]; then
		dir_name="~${PWD:${#HOME}}"
	fi

	# Git branch name and work tree status (only when we are inside Git working tree)
	local git_prompt=
	if [[ "true" = "$(git rev-parse --is-inside-work-tree 2>/dev/null)" ]]; then
		# Branch name
		local branch="$(git symbolic-ref HEAD 2>/dev/null)"
		branch="${branch##refs/heads/}"

		# Working tree status (red when dirty)
		local branch_color="$GREEN"
		git diff --no-ext-diff --quiet --exit-code --ignore-submodules || branch_color="$RED"

		# Format Git info
		git_prompt=" #$branch_color$branch$NOCOLOR"
	fi

	# Only show username if not default
	local user_prompt=
	[ "$USER" != "$local_username" ] && user_prompt="$user_color$USER$NOCOLOR"

	# Show hostname inside SSH session
	local host_prompt=
	[ -n "$remote" ] && host_prompt="@$YELLOW$HOSTNAME$NOCOLOR"

	# Show delimiter if user or host visible
	local login_delimiter=
	[ -n "$user_prompt" ] || [ -n "$host_prompt" ] && login_delimiter=":"

	# Format prompt
	# \033[G moves the cursor to the first column: http://jonisalonen.com/2012/your-bash-prompt-needs-this/
	# Text (commands) inside \[...\] does not impact line length which fixes stange bug when looking through the history
	PS1="\033[G\n$user_prompt$host_prompt$login_delimiter$WHITE$dir_name$NOCOLOR$git_prompt\n\[$CYAN\]$prompt_symbol\[$NOCOLOR\] "

	# Terminal title
	local title="$(basename $dir_name)"
	[ -n "$remote" ] && title="$title \xE2\x80\x94 $HOSTNAME"
	echo -ne "\033]0;$title"; echo -ne "\007"
}

# Show awesome prompt only if Git is istalled
command -v git >/dev/null 2>&1 && PROMPT_COMMAND=prompt_command
