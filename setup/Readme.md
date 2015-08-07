## Prerequisites

* [Command Line Tools for Xcode](https://developer.apple.com/downloads)


## :skull: Bootstrap :skull:

Run `./bootstrap.sh` (or separate scripts in this folder) and make you some coffee. Then open Chrome (now it’s your default browser) and install [all needed apps](https://github.com/sapegin/dotfiles/wiki/OS-X-Apps).

**Warning**. Your Mac can turn into a pumpkin.


## Scripts

### stuff

Installs Homebrew, Git, [git-extras](https://github.com/visionmedia/git-extras), [git-friendly](https://github.com/jamiew/git-friendly), Node.js, JSHint, Grunt, configures Apache, PHP, MySQL, etc.

### bash

Installs Bash 4 and registers it as a default shell. Needs Homebrew.

### consolas

Installs Consolas font. Needs Homebrew.

### imgo

Installs [imgo](https://github.com/imgo/imgo) CLI image optimizer. Needs Homebrew.

### osx

Sane OSX defaults. Based on [~/.osx](http://mths.be/osx) by @mathiasbynens.

### sublime-settings

Enables Sublime settings syncronization (see `../sublime/User` folder).

### sublime-packages

Installs/updates Sublime packages from Package Control (listed in `../sublime/User/Package Control.sublime-settings`) and GitHub (listed in script itself).

### apps

Installs Chrome and makes it default browser.

### quicklook

Installs quick look plugins: qlImageSize.

### update

Get OS X software updates, update Homebrew, NPM, Ruby packages, dotfiles and some other software.


## Tips & Tricks

### Local Git identity

```
git config -f ~/.gitlocal user.email "artem@sapegin.ru"
git config -f ~/.gitlocal user.name "Artem Sapegin"
```

### How to remove US English keyboard layout on Mac OS X

Useful when you use some kind of [typography layout](http://ilyabirman.ru/projects/typography-layout/).

```bash
bash  <(curl -fsSkL https://raw.githubusercontent.com/bolknote/shellgames/master/us_layout_remover.sh)
```

### How to open files in different apps depending on their location by Cmd+click in iTerm2

Create a script:

```bash
#!/usr/bin/env bash

if  [[ "$1" == /Users/admin/badoo/* ]]; then
	/usr/local/bin/pstorm "$1"
	open /Applications/PhpStorm.app  # Focus
else
	open "$1"
fi
```

Go to iTerm2 preferences → Profiles → Advanced → Semantic History. Choose *Run command* and type: `/Users/admin/bin/iopen "\1"`.

## Misc

* [OSX Python developer guide](https://gist.github.com/902296)
