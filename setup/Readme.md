## Prerequisites

* [Command Line Tools for Xcode](https://developer.apple.com/downloads)


## :skull: Bootstrap :skull:

Run `./bootstrap.sh` (or separate scripts in this folder) and make you some coffee. Then open Chrome (now it’s your default browser) and install [all needed apps](https://github.com/sapegin/dotfiles/wiki/Mac-OS-Apps).

**Note**. Your Mac can turn into a pumpkin.


## Scripts

### brew

Installs Homebrew with some formulaes (Git, MySQL, Node.js, etc.).

### npm

Installs some NPM modules (JSHint, Grunt, etc.). Depends on `brew`.

### bash

Installs Bash 4 and registers it as a default shell. Depends on `brew`.

### consolas

Installs Consolas font. Depends on `brew`.

### imgo

Installs [imgo](https://github.com/imgo/imgo) CLI image optimizer. Depends on `brew`.

### osx

Sane OSX defaults. Based on [~/.osx](http://mths.be/osx) by @mathiasbynens.

### sublime-settings

Enables Sublime settings syncronization (see `../sublime/User` folder).

### sublime-packages

Installs/updates Sublime packages from Package Control (listed in `../sublime/User/Package Control.sublime-settings`) and GitHub (listed in script itself).

### apps

Installs Chrome and makes it default browser.


## Tips & Tricks

### How to remove US English keyboard layout on Mac OS X

Useful when you use some kind of [typography layout](http://ilyabirman.ru/projects/typography-layout/).

```bash
bash  <(curl -fsSkL raw.github.com/bolknote/shellgames/master/us_layout_remover.sh)
```


## Misc

* [OSX Python developer guide](https://gist.github.com/902296)