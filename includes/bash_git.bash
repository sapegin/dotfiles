# Git related Bash aliases

github_user="sapegin"
bitbucket_user="sapegin"


# `cd` to repo root
alias git-root='git rev-parse 2>/dev/null && cd "./$(git rev-parse --show-cdup)"'
alias gr="git-root"

# Setup syncronization of current Git repo with GitHub repo of the same name
# USAGE: git-github [repo]
function git-github() {
	local repo=${1-`basename "$(pwd)"`}
	git remote add origin "git@github.com:$github_user/$repo.git"
	git push -u origin master
}

# Setup syncronization of current Git repo with Bitbucket repo of the same name
# USAGE: git-bitbucket [repo]
function git-bitbucket() {
	local repo=${1-`basename "$(pwd)"`}
	git remote add origin "git@bitbucket.org:$bitbucket_user/$repo.git"
	git push -u origin master
}

# Add remote upstream
# USAGE: git-fork <original-author>
function git-fork() {
	local user=$1
	if [[ "$user" == "" ]]; then
		echo "Usage: git-fork <original-author>"
	else
		local repo=`basename "$(pwd)"`
		git remote add upstream "git@github.com:$user/$repo.git"
	fi
}

# Sync branch with upstream
# USAGE: git-upstream [branch]
function git-upstream() {
	local branch=${1-master}
	git fetch upstream
	git checkout $branch
	git merge upstream/$branch
}

# Add all staged files to previous commit
function git-append() {
	git log -n 1 --pretty=tformat:%s%n%n%b | git commit -F - --amend
}

# List of files with unresolved conflicts
function git-conflicts() {
	git ls-files -u | awk '{print $4}' | sort -u
}
