# Git Awesomeness

## Aliases

* **git a** → `git add`
* **git ua** → `git reset HEAD` (unadd)
* **git c** → `git commit`
* **git ca** → `git commit -a`
* **git cm** → `git commit -m`
* **git cam** → `git commit -am`
* **git cne** → `git commit --no-edit`
* **git co** → `git checkout`
* **git d** → `git diff --color-words`
* **git s** → `git status -sb`
* **git new <feature>** → Start a git-flow feature.
* **git done <feature>** → Finish a git-flow feature in the current branch.
* **git go** → Checkout branch and pull.
* **git master** → Checkout `master` branch.
* **git develop** → Checkout `develop` branch.
* **git mmm** → Merge `master` into the current branch.
* **git ddd** → Merge `develop` into the current branch.
* **git l** → Simple one-line-per-commit log.
* **git ll** → Log with list of changed files for each commit.
* **git wtf** → List of files with unresolved Git conflicts..
* **git my** → List of all my commits.


## [git-friendly](https://github.com/jamiew/git-friendly)

### pull

Stash any local changes, pull from remote using rebase, updates submodules, pop your stash, then run `bundle install` and/or `npm install` if necessary.

### push

Push your changes to the remote + copy a sexy diff URL like http://github.com/jamiew/git-friendly/compare/e96033…5daed4 to your clipboard (works on Mac and Linux).

### branch [name]

Switch branches or create new local branch if it doesn’t exist. Intelligently sets up remote branch tracking so you can just type `git pull` and not always `git pull origin newbranch`. If no argument specified will list all local and remote branches.

### merge [name]

Merge the specified branch into the current branch. Rebases first if the branch is local-only.


## [git-extras](https://github.com/visionmedia/git-extras)

See `git extras --help` or [documentation](https://github.com/visionmedia/git-extras/blob/master/Readme.md) for all available commands.


## [hub](https://github.com/defunkt/hub)

See `hub help` or [documentation](http://defunkt.io/hub/hub.1.html) for all available commands.
