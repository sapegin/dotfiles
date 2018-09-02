# Squirrelbook Fish prompt
# 
# Inspired by: https://github.com/sindresorhus/pure
#
# Author: Artem Sapegin, sapegin.me
# License: MIT
# https://github.com/sapegin/dotfiles

set PROMPT_SYMBOL "❯"
set CLEAN_SYMBOL "☀"
set DIRTY_SYMBOL "☂"

function git_branch_name
    echo (git rev-parse --abbrev-ref HEAD ^/dev/null)
end

function is_git_dirty
      echo (git status -s --ignore-submodules=dirty ^/dev/null)
end

function fish_prompt
	set -l last_status $status

    # New line
    echo

    # User and host
   	if begin; test $SSH_CONNECTION; or test $LOGNAME != $USER; end
        # Print username, emphasise working as a root
        set_color white
        if [ $USER = "root" ]
            set_color red
        end
        echo -n $USER

        # Print host if inside an SSH connection
        if [ $SSH_CONNECTION ]
            set_color $fish_color_host
            echo -n "@"
            set_color cyan
            echo -n (prompt_hostname)
        end

        set_color normal
        echo -n ": "
    end

    set_color $fish_color_cwd
    echo -n (prompt_pwd)

    set -l git_branch (git_branch_name)
    if [ $git_branch ]
        if [ (is_git_dirty) ]
            set_color red
            echo -n " "$DIRTY_SYMBOL" "$git_branch
        else
            set_color green
            echo -n " "$CLEAN_SYMBOL" "$git_branch
        end
    end

    # New line
    echo

    # Arrow, red if the last command has returned non-zero status
    if test $last_status -eq 0
        set_color cyan
    else
        set_color red
    end
    echo -e $PROMPT_SYMBOL" "
end
