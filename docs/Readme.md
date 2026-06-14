# Dotfiles

# General

- Show command docs:

`help {{command}}`

- Fuzzy finder:

`Ctrl+R (help fzf for more)`

# Navigation and filesystem

- Navigate to a parent folder:

`.. ... .... .....`

- Navigate to a previous folder:

`-`

- Navigate to whatever is the forefront Finder window:

`cdf`

- Navigate to a project folder:

`j {{name}}`

- Make a folder and navigate to it:

`take {{folder}}`

- Make a file executable:

`+x {{file}}`

- Find file by name (or regexp):

`find {{file}}`

- Quick grep:

`g`

- Copy full path of a given file to clipboard:

`ppp {{file}}`

- Download file and save it with filename of remote file:

`get {{url}}`

# Apps

- Open file in default app:

`o {{file}}`

- Open current folder in Finder:

`oo`

- Open file in default editor:

`e {{file}}`

- Open current folder in Visual Studio Code:

`cc`

- Open current folder in Nimble Commander:

`nn`

- Open current folder in GitHub Desktop:

`ghd`

# Git

- Clone a repository and navigate to it:

`clone {{url}}`

- Navigate to root of Git repository:

`gr`

- Pull remote changes:

`pull`

- Push local changes:

`push`

- Merge a branch into the current one:

`merge {{branch}}`

- Stash all changes:

`stash`

- Change Git branch and pull:

`br {{branch}}`

- Remove old Git branches and do other cleanup:

`git-cleanup`

- Initialize Git repository:

`git-setup`

# Maintenance

- Empty trash on all mounted volumes:

`clean-trash`

- Update dotfiles:

`dotfiles`

- Get macOS software updates, update Homebrew, npm, dotfiles, etc:

`update`
