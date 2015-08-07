# Artem Sapegin’s dotfiles

![Terminal.app](https://raw.github.com/sapegin/dotfiles/master/color/squirrelsong_terminal.png)


## Features

* Custom color scheme.
* Custom Bash prompt, useful aliases, etc.
* Git config, Git global ignore file.
* Dotfiles syncronization (`sync.py`).
* Sensible OS X defaults (`setup/osx.sh`).
* Sublime Text 3 settings syncronization and packages autoinstall (`setup/sublime-settings.sh`).
* Consolas font install script (`setup/consolas.sh`).
* Bash4 install script (`setup/bash.sh`).
* OS X, Homebrew, NPM, etc. update script (`setup/update.sh`).
* My magic project opener (`bin/repo`).
* Many other useful scripts in `bin/` directory.
* [Bash](https://github.com/sapegin/dotfiles/blob/master/docs/Bash.md) & [Git](https://github.com/sapegin/dotfiles/blob/master/docs/Git.md) aliases and scripts.
* User scripts for browser: `userscripts/`.
* Stop words lists that I use with Marked 2: `dict/`.
* [Mac OS X apps I use](https://github.com/sapegin/dotfiles/wiki/OS-X-Apps).


## Installation

(Fork this repo if you want to use my dotfiles.)

Prerequisites:

1. [Install Xcode Command Line Tools](http://railsapps.github.io/xcode-command-line-tools.html).
1. [Generate SSH key](https://help.github.com/articles/generating-ssh-keys/).
1. [Install Homebrew](http://brew.sh/).

Then run these commands in the terminal:

```
brew install git
git clone git@github.com:sapegin/dotfiles.git ~/dotfiles
cd ~/dotfiles
./sync
cd ~/dotfiles/setup
```

Now you can run scripts like `osx.sh` or `server.sh` to install other stuff.


## Updating

```bash
dotfiles
```


## Notes

You can use any file extensions in `tilde/` to invoke proper syntax highlighting in code editor.


## Further customization

* Add any Bash profile customizations to `~/.bashlocal`.
* Add your git username/email/etc. to `~/.gitlocal`.


## Resources

* [GitHub ❤ ~/](http://dotfiles.github.com/)
* [Mathias’s dotfiles](https://github.com/mathiasbynens/dotfiles)
* [Jan Moesen’s dotfiles](https://github.com/janmoesen/tilde)
* [Nicolas Gallagher’s dotfiles](https://github.com/necolas/dotfiles)
* [Zach Holman’s dotfiles](https://github.com/holman/dotfiles)
* [Jacob Gillespie’s dotfiles](https://github.com/jacobwg/dotfiles)
* [Yet Another Dotfile Repo](https://github.com/skwp/dotfiles)
* [Mac OS X Lion Setup](https://github.com/ptb/Mac-OS-X-Lion-Setup)


---

:shipit: