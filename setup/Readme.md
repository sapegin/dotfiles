## Prerequisites

* [Command Line Tools for Xcode](https://developer.apple.com/downloads)

## Scripts

### stuff

Installs Homebrew, Git, [git-extras](https://github.com/visionmedia/git-extras), [git-friendly](https://github.com/jamiew/git-friendly), Node.js, JSHint, Grunt, configures Apache, PHP, MySQL, etc.

### zsh

Installs zsh and Oh My Zsh, registers zsh as a default shell.

### osx

Sane OSX defaults. Based on [~/.osx](http://mths.be/osx) by @mathiasbynens.

### sublime-settings

Enables Sublime settings syncronization (see `../sublime/User` folder).

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

### Per repository Git identity

```
cd ~/repo
git config user.email "artem.sapegin@example.com"
git config user.name "Artem Sapegin"
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
